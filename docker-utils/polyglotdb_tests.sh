#!/bin/bash

# Script to run PolyglotDB tests inside Docker.
# Before running, create a superuser with name test_user and password notarealpassword .

echo "Downloading PolyglotDB."
git clone https://github.com/MontrealCorpusTools/PolyglotDB.git 

echo "Running tests."
${SITE_DIR}/env/bin/python setup.py test

echo "Removing PolyglotDB."
rm -rf PolyglotDB