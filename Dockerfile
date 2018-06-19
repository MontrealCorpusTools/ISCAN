#==== Pre-installation ====

# Create the image based on Ubuntu (we will install things on it)
FROM ubuntu
MAINTAINER Arlie Coles <arlie.coles@mail.mcgill.ca>
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && apt-get install -y software-properties-common
CMD /bin/bash
EXPOSE 5432:5432

# Get git
RUN apt-get update && apt-get install -y git

# Get Python 3 and pip3
RUN apt-get update && apt-get install -y python3.4 python3-pip

# Get Java 8
RUN add-apt-repository -y ppa:webupd8team/java && \
 apt-get update -y && \
	echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | /usr/bin/debconf-set-selections
RUN apt-get install -y oracle-java8-installer

# Get Django
RUN pip3 install django psycopg2-binary
RUN if [ ! -f /usr/local/bin/django-admin.py ]; then ln -s /home/docker/.local/bin/django-admin.py /usr/local/bin; fi
RUN chmod +x /usr/local/bin/django-admin.py

# Get barren Praat and add it to the path
RUN wget http://www.fon.hum.uva.nl/praat/praat6040_linux64barren.tar.gz && \
 gunzip praat6040_linux64barren.tar.gz && \
 tar xvf praat6040_linux64barren.tar && \
 mv praat_barren praat && \
	export PATH=$PATH:/$PWD

# Get Reaper (should already be on path)
RUN apt-get update && apt-get install -y cmake
RUN git clone https://github.com/google/REAPER.git && \
	cd REAPER && \
 mkdir build && \
	cd build && \
 cmake .. && \
 make

# Get Dockerize
RUN apt-get update && apt-get install -y wget
ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz &&\
	export PATH=$PATH:/$PWD

# Get Node.js
ADD . /polyglot-server-master
WORKDIR /polyglot-server-master
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
	DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs && \
	DEBIAN_FRONTEND=noninteractive apt-get install -y npm && \
 	DEBIAN_FRONTEND=noninteractive npm install -y && \
 	npm install -y -g angular-cli
ENV NODE_PATH /polyglot-server-master/node_modules

#==== Installation ====

# Install the server's dependencies
RUN pip3 install -r requirements.txt

# Get the latest version of PolyglotDB (useful for development)
RUN pip3 install https://github.com/MontrealCorpusTools/PolyglotDB/archive/master.zip