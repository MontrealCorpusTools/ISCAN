#!/usr/bin/env python
import os
import sys

# Comment out to use system polyglotdb
sys.path.insert(0, 'PolyglotDB')

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "polyglot_server.settings")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
