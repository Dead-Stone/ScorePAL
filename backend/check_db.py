#!/usr/bin/env python3
"""
Database checker script for ScorePAL
"""

import sqlite3
from datetime import datetime

def check_database():
    try:
        conn = sqlite3.connect('data/scorepal_users.db')
        cursor = conn.cursor()

        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print('=== TABLES IN DATABASE ===')
        for table in tables:
            print(f'  - {table[0]}')

        # Check user table structure
        print('\n=== USER TABLE STRUCTURE ===')
        cursor.execute('PRAGMA table_info(user);')
        columns = cursor.fetchall()
        for col in columns:
            print(f'  {col[1]} ({col[2]}) {"- PRIMARY KEY" if col[5] else ""}')

        # Count users
        cursor.execute('SELECT COUNT(*) FROM user;')
        user_count = cursor.fetchone()[0]
        print(f'\n=== USER STATISTICS ===')
        print(f'Total users: {user_count}')

        # Show recent users (if any)
        if user_count > 0:
            cursor.execute('''
                SELECT id, email, first_name, last_name, role, is_active, is_verified, 
                       grading_count, free_gradings_used, premium_active, created_at 
                FROM user ORDER BY created_at DESC LIMIT 10;
            ''')
            users = cursor.fetchall()
            print('\n=== RECENT USERS ===')
            for user in users:
                print(f'''
  ID: {user[0]}
  Email: {user[1]}
  Name: {user[2]} {user[3]}
  Role: {user[4]}
  Active: {user[5]}
  Verified: {user[6]}
  Gradings: {user[7]} (Free used: {user[8]})
  Premium: {user[9]}
  Created: {user[10]}
  ---''')
        else:
            print('No users found in database.')

        # Show role distribution
        cursor.execute('SELECT role, COUNT(*) FROM user GROUP BY role;')
        roles = cursor.fetchall()
        if roles:
            print('\n=== ROLE DISTRIBUTION ===')
            for role, count in roles:
                print(f'  {role}: {count}')

        conn.close()
        print('\n✅ Database check completed successfully!')

    except Exception as e:
        print(f'❌ Error checking database: {e}')

if __name__ == '__main__':
    check_database() 