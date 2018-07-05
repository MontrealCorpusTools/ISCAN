This is a complete working demo of docker compose working with a django project.

Features:
 - split into nginx/postgres/app containers
 - configuration is set by environment variables
 - changes to the django app will auto-reload the uwsgi process

# DOCKER COMPOSE

    Build and start the app:

        docker-compose up
        # Or to rebuild
        docker-compose up --build

        # migrate and collectstatic
        docker-compose run app init

        # create admin user
        docker-compose run app manage createsuperuser

    Other helpful commands

        # enter db
        docker-compose run app manage dbshell

        # run any management command
        docker-compose run app manage <command and options>

        # enter bash shell
        docker-compose run app /bin/bash

        # stop everything
        docker-compose stop

        # stop everything, destroy containers, and volumes
        docker-compose down

    Override the default docker compose variables

        # vim docker-compose.override.yml
        version: '3'
        services:
            web:
              ports:
                - 8000:80
