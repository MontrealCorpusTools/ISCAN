#!/bin/bash

set -eox

if [ -z "$1" ]; then
	${SITE_DIR}/env/bin/python ${SITE_DIR}/proj/manage.py runserver --verbosity 3 0.0.0.0:8080
else
	if [ "$1" == 'init' ]; then
	    echo "Run Migrations"
	    ${SITE_DIR}/env/bin/python ${SITE_DIR}/proj/manage.py makemigrations
	    ${SITE_DIR}/env/bin/python ${SITE_DIR}/proj/manage.py migrate
	    #${SITE_DIR}/env/bin/python ${SITE_DIR}/proj/manage.py collectstatic --no-input --clear
	elif [ "$1" == 'manage' ]; then
	    shift
	    echo "Manage.py $@"
	    ${SITE_DIR}/env/bin/python ${SITE_DIR}/proj/manage.py $@
	elif [ "$1" == 'test' ]; then
	    #Have to run twice in order to get the database list to refresh for some reason
	    # | true is because set -eox pipfall exits on a non 0 exit code, and failed tests don't have 0 exit codes
	    ${SITE_DIR}/env/bin/python manage.py test pgdb.test_web | true
	    sleep 60
	    ${SITE_DIR}/env/bin/python manage.py test pgdb.test_web
	elif [ "$1" == 'test_cov' ]; then
	    #Have to run twice in order to get the database list to refresh for some reason
	    # | true is because set -eox pipfall exits on a non 0 exit code, and failed tests don't have 0 exit codes
	    ${SITE_DIR}/env/bin/python manage.py test pgdb.test_web | true
	    sleep 60
	    coverage run --source='.' manage.py test pgdb.test_web
	else
	    exec "$@"
	fi
fi
