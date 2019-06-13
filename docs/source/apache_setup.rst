.. _Let's encrypt: https://letsencrypt.org/

.. _Gunicorn: https://gunicorn.org/

.. _Apache: https://httpd.apache.org/

.. _NGINX: https://www.nginx.com/

.. _Django dev server: https://docs.djangoproject.com/en/2.2/ref/django-admin/#runserver

***************************
Apache server configuration
***************************

The current recommended configuration is to have a forward facing web server (`Apache`_/`NGINX`_) proxy pass to a locally running
server (`Gunicorn`_/`Django dev server`_).  The following all assumes that there is a locally running server running on port 8080,
and uses Apache as the example configs listed below, as well as the hostname https://roquefort.linguistics.mcgill.ca/.

Additionally, since there is sensitive data involved, we heavily recommend using HTTPS rather than HTTP.

.. note::

    All commands assume Ubuntu 16.04.  Commands may differ depending on other operating systems.

Enabling prerequisite Apache modules
====================================

.. code-block:: bash

   sudo apt-get install apache2
   sudo service apache2 stop
   sudo a2enmod rewrite
   sudo a2enmod ssl
   sudo a2enmod proxy
   sudo a2enmod proxy_http

HTTP server config
==================

The HTTP server config uses the rewrite module to change any HTTP requests into HTTPS ones, so that there is never any use
of http://roquefort.linguistics.mcgill.ca/ over https://roquefort.linguistics.mcgill.ca/.  The following config
would be saved to a file named ``roquefort.linguistics.mcgill.ca.conf`` in ``/etc/apache2/sites-available/``.

.. code-block:: apache

   <VirtualHost *:80>

       ServerName roquefort.linguistics.mcgill.ca  # Update for other hostname
       ServerAdmin webmaster@localhost
       DocumentRoot /var/www/html


       ErrorLog ${APACHE_LOG_DIR}/error.log
       CustomLog ${APACHE_LOG_DIR}/access.log combined

       RewriteEngine on
       RewriteCond %{SERVER_NAME} =roquefort.linguistics.mcgill.ca  # Update for other hostname
       RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
   </VirtualHost>

Enable the site via:

.. code-block:: bash

    sudo a2ensite roquefort.linguistics.mcgill.ca.conf

HTTPS server config
===================

The primary configuration file for the Apache server is the HTTPS one below. SSL certificates are easily generated through `Let's encrypt`_.
The Proxy module for Apache is used to forward all requests to the locally running ISCAN server.  The following config
would be saved to a file named ``roquefort.linguistics.mcgill.ca-ssl.conf`` in ``/etc/apache2/sites-available/``.

.. code-block:: apache

   <IfModule mod_ssl.c>
   <VirtualHost *:443>

       ServerName roquefort.linguistics.mcgill.ca  # Update for other hostname

       ServerAdmin webmaster@localhost
       DocumentRoot /var/www/html

       ErrorLog ${APACHE_LOG_DIR}/error.log
       CustomLog ${APACHE_LOG_DIR}/access.log combined

       SSLCertificateFile /etc/letsencrypt/live/roquefort.linguistics.mcgill.ca/fullchain.pem  # Update for actual location
       SSLCertificateKeyFile /etc/letsencrypt/live/roquefort.linguistics.mcgill.ca/privkey.pem  # Update for actual location
       Include /etc/letsencrypt/options-ssl-apache.conf

       <Location "/">
               ProxyPass http://localhost:8080/
               ProxyPassReverse http://localhost:8080/
               ProxyPreserveHost On
               RequestHeader unset X-Forwarded-Proto

               RequestHeader set X-Forwarded-Proto https env=HTTPS
        </Location>

   </VirtualHost>
   </IfModule>

Enable the site via:

.. code-block:: bash

    sudo a2ensite roquefort.linguistics.mcgill.ca-ssl.conf

Once the configuration files are set up, the Apache server can be rebooted via:

.. code-block:: bash

    sudo service apache2 restart