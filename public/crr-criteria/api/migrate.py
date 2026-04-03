#!/usr/bin/env python3
"""
CRR Criteria Migration Script
Extracts criteria from monolithic HTML files and outputs:
  1. D1 INSERT statements for the criteria table
  2. Initial version record
  3. KV publish payload (JSON)

Usage:
  python3 migrate.py --explorer crr-criteria-explorer-v3_4_4.html \
                     --triage crr-triage-advisor-v1_2_3_002.html \
                     --output-dir ./migration-output

Then run:
  wrangler d1 execute crr-criteria --file=migration-output/seed.sql
  wrangler kv:key put --binding=KV "criteria:published" --path=migration-output/kv-published.json
  wrangler kv:key put --binding=KV "criteria:match-data" --path=migration-output/kv-match-data.json
  wrangler kv:key put --binding=KV "criteria:version" --path=migration-output/kv-version.json
"""

import json
import re
import os
import sys
from datetime import datetime

def extract_json_block(html, prefix):
    """Extract a JSON object/array that follows a var assignment."""
    start = html.find(prefix)
    if start == -1:
        return None
    start += len(prefix)
    
    # Determine if object or array
    opener = html[start]
    closer = '}' if opener == '{' else ']'
    
    depth = 0
    i = start
    while i < len(html):
        if html[i] == opener:
            depth += 1
        elif html[i] == closer:
            depth -= 1
            if depth == 0:
                break
        i += 1
    
    return json.loads(html[start:i + 1])


def extract_explorer_data(html):
    """Extract DATA from the Criteria Explorer."""
    data = extract_json_block(html, 'var DATA = ')
    paed = extract_json_block(html, 'var PAED_EXAMS = ')
    regions = extract_json_block(html, 'var REGIONS = ')
    return data, paed or [], regions or {}


def extract_triage_data(html):
    """Extract MATCH_DATA from the Triage Advisor."""
    return extract_json_block(html, 'var MATCH_DATA = ')


def build_criteria_rows(data, paed_exams):
    """Convert the DATA structure into flat criteria rows for D1."""
    rows = []
    now = datetime.utcnow().isoformat() + 'Z'
    
    # Adult exams
    for exam in data.get('exams', []):
        if exam['type'] == 'multisite':
            for site in exam.get('sites', []):
                row = {
                    'id': site['id'],
                    'title': f"{exam['title']} — {site['label']}",
                    'modality': exam['modality'],
                    'type': 'multisite',
                    'population': 'adult',
                    'data': {
                        'examId': exam['id'],
                        'examTitle': exam['title'],
                        'siteLabel': site['label'],
                        'inlineGuidance': site.get('inlineGuidance', ''),
                        'groups': site.get('groups', []),
                        'guidance': exam.get('guidance', ''),
                        'healthPathwaysUrl': site.get('healthPathwaysUrl', '') or exam.get('healthPathwaysUrl', ''),
                        'guidanceNarrative': site.get('guidanceNarrative', ''),
                        'alternativeManagement': site.get('alternativeManagement', ''),
                        'notFundedDetail': site.get('notFundedDetail', ''),
                        'outOfCriteriaNote': site.get('outOfCriteriaNote', ''),
                        'footnotes': site.get('footnotes', ''),
                        'safetyQuestions': exam.get('safetyQuestions', []),
                    },
                    'updated_at': now,
                    'updated_by': 'migration',
                }
                rows.append(row)
        else:
            row = {
                'id': exam['id'],
                'title': exam['title'],
                'modality': exam['modality'],
                'type': 'singlesite',
                'population': 'adult',
                'data': {
                    'groups': exam.get('groups', []),
                    'guidance': exam.get('guidance', ''),
                    'healthPathwaysUrl': exam.get('healthPathwaysUrl', ''),
                    'guidanceNarrative': exam.get('guidanceNarrative', ''),
                    'alternativeManagement': exam.get('alternativeManagement', ''),
                    'notFundedDetail': exam.get('notFundedDetail', ''),
                    'outOfCriteriaNote': exam.get('outOfCriteriaNote', ''),
                    'footnotes': exam.get('footnotes', ''),
                },
                'updated_at': now,
                'updated_by': 'migration',
            }
            rows.append(row)
    
    # Paediatric exams
    for exam in paed_exams:
        if exam['type'] == 'multisite':
            for site in exam.get('sites', []):
                row = {
                    'id': site['id'],
                    'title': f"{exam['title']} — {site['label']} (Paediatric)",
                    'modality': exam['modality'],
                    'type': 'multisite',
                    'population': 'paediatric',
                    'data': {
                        'examId': exam['id'],
                        'examTitle': exam['title'],
                        'siteLabel': site['label'],
                        'inlineGuidance': site.get('inlineGuidance', ''),
                        'groups': site.get('groups', []),
                        'guidance': exam.get('guidance', ''),
                        'healthPathwaysUrl': site.get('healthPathwaysUrl', '') or exam.get('healthPathwaysUrl', ''),
                        'guidanceNarrative': site.get('guidanceNarrative', ''),
                        'alternativeManagement': site.get('alternativeManagement', ''),
                        'notFundedDetail': site.get('notFundedDetail', ''),
                        'outOfCriteriaNote': site.get('outOfCriteriaNote', ''),
                        'footnotes': site.get('footnotes', ''),
                    },
                    'updated_at': now,
                    'updated_by': 'migration',
                }
                rows.append(row)
    
    return rows


def sql_escape(s):
    """Escape a string for SQL insertion."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def generate_seed_sql(rows, version_label, data, paed_exams):
    """Generate SQL INSERT statements."""
    now = datetime.utcnow().isoformat() + 'Z'
    lines = [
        '-- CRR Criteria Migration',
        f'-- Generated: {now}',
        f'-- Version: {version_label}',
        f'-- Criteria rows: {len(rows)}',
        '',
        '-- Clear existing data',
        'DELETE FROM criteria;',
        '',
        '-- Insert criteria',
    ]
    
    for row in rows:
        data_json = json.dumps(row['data'], separators=(',', ':'))
        lines.append(
            f"INSERT INTO criteria (id, title, modality, type, population, data, updated_at, updated_by) "
            f"VALUES ({sql_escape(row['id'])}, {sql_escape(row['title'])}, {sql_escape(row['modality'])}, "
            f"{sql_escape(row['type'])}, {sql_escape(row['population'])}, "
            f"{sql_escape(data_json)}, {sql_escape(row['updated_at'])}, {sql_escape(row['updated_by'])});"
        )
    
    # Create initial version record
    snapshot_json = json.dumps(rows, separators=(',', ':'))
    lines.extend([
        '',
        '-- Initial version',
        f"INSERT INTO versions (version_label, notes, criteria_snapshot, status, created_at, created_by, published_at, published_by) "
        f"VALUES ({sql_escape(version_label)}, 'Initial migration from monolithic HTML files', "
        f"{sql_escape(snapshot_json)}, 'published', {sql_escape(now)}, 'migration', {sql_escape(now)}, 'migration');",
        '',
        '-- Audit log entry',
        f"INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at) "
        f"VALUES ('publish', 'version', '1', 'migration', {sql_escape(now)});",
    ])
    
    return '\n'.join(lines)


def generate_kv_payloads(data, paed_exams, match_data, version_label):
    """Generate KV key-value payloads."""
    now = datetime.utcnow().isoformat() + 'Z'
    
    # Add paed to data for the viewer
    data_with_paed = dict(data)
    data_with_paed['paedExams'] = paed_exams
    
    published = {
        'version': version_label,
        'publishedAt': now,
        'publishedBy': 'migration',
        'data': data_with_paed,
    }
    
    version_info = {
        'version': version_label,
        'publishedAt': now,
        'publishedBy': 'migration',
        'criteriaCount': sum(
            len(site.get('groups', []))
            for exam in data.get('exams', [])
            for site in (exam.get('sites', []) if exam['type'] == 'multisite' else [exam])
        ),
    }
    
    return published, match_data, version_info


def main():
    import argparse
    parser = argparse.ArgumentParser(description='CRR Criteria Migration')
    parser.add_argument('--explorer', required=True, help='Path to CRR Criteria Explorer HTML')
    parser.add_argument('--triage', required=True, help='Path to CRR Triage Advisor HTML')
    parser.add_argument('--output-dir', default='./migration-output', help='Output directory')
    parser.add_argument('--version', default='v3.4.4', help='Version label')
    args = parser.parse_args()
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Extract data
    print(f"Reading {args.explorer}...")
    with open(args.explorer) as f:
        explorer_html = f.read()
    data, paed_exams, regions = extract_explorer_data(explorer_html)
    
    print(f"Reading {args.triage}...")
    with open(args.triage) as f:
        triage_html = f.read()
    match_data = extract_triage_data(triage_html)
    
    print(f"  Exams: {len(data['exams'])} adult, {len(paed_exams)} paediatric")
    print(f"  Match data: {len(match_data['synonyms'])} synonym groups, {len(match_data['index'])} site entries")
    
    # Build criteria rows
    rows = build_criteria_rows(data, paed_exams)
    print(f"  Criteria rows: {len(rows)}")
    
    # Generate SQL
    sql = generate_seed_sql(rows, args.version, data, paed_exams)
    sql_path = os.path.join(args.output_dir, 'seed.sql')
    with open(sql_path, 'w') as f:
        f.write(sql)
    print(f"  Wrote {sql_path} ({len(sql)} chars)")
    
    # Generate KV payloads
    published, match, version_info = generate_kv_payloads(data, paed_exams, match_data, args.version)
    
    pub_path = os.path.join(args.output_dir, 'kv-published.json')
    with open(pub_path, 'w') as f:
        json.dump(published, f, separators=(',', ':'))
    print(f"  Wrote {pub_path} ({os.path.getsize(pub_path)} bytes)")
    
    match_path = os.path.join(args.output_dir, 'kv-match-data.json')
    with open(match_path, 'w') as f:
        json.dump(match, f, separators=(',', ':'))
    print(f"  Wrote {match_path} ({os.path.getsize(match_path)} bytes)")
    
    ver_path = os.path.join(args.output_dir, 'kv-version.json')
    with open(ver_path, 'w') as f:
        json.dump(version_info, f, indent=2)
    print(f"  Wrote {ver_path}")
    
    print(f"\nMigration complete. Next steps:")
    print(f"  1. wrangler d1 execute crr-criteria --file={sql_path}")
    print(f"  2. wrangler kv:key put --binding=KV 'criteria:published' --path={pub_path}")
    print(f"  3. wrangler kv:key put --binding=KV 'criteria:match-data' --path={match_path}")
    print(f"  4. wrangler kv:key put --binding=KV 'criteria:version' --path={ver_path}")


if __name__ == '__main__':
    main()
