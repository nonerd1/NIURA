import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

def setup_database():
    """
    Create the PostgreSQL database for NIURA
    """
    try:
        # Connect to PostgreSQL server - use current user on macOS
        current_user = os.environ.get('USER', os.environ.get('USERNAME', 'postgres'))
        print(f"Connecting with user: {current_user}")
        
        # Connect to the default 'postgres' database first
        conn = psycopg2.connect(
            user=current_user,
            # No password needed for local macOS PostgreSQL installation using Homebrew
            host="localhost",
            port="5432",
            database="postgres"  # Connect to the default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        # Create a cursor object
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'niura_db'")
        exists = cursor.fetchone()
        
        if not exists:
            print("Creating database 'niura_db'...")
            cursor.execute("CREATE DATABASE niura_db")
            print("Database created successfully!")
        else:
            print("Database 'niura_db' already exists.")
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("Database setup completed successfully!")
        return True
        
    except (Exception, psycopg2.Error) as error:
        print(f"Error while connecting to PostgreSQL: {error}")
        return False

if __name__ == "__main__":
    setup_database() 