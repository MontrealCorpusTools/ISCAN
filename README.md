# ISCAN

[![Build Status](https://travis-ci.org/MontrealCorpusTools/iscan-server.svg?branch=master)](https://travis-ci.org/MontrealCorpusTools/iscan-server)
[![Coverage Status](https://coveralls.io/repos/github/MontrealCorpusTools/iscan-server/badge.svg?branch=master)](https://coveralls.io/github/MontrealCorpusTools/iscan-server?branch=master)

## Introduction

ISCAN (Integrated Speech Corpus ANalysis) is a package to manage and analyze corpora from within a Django server with support for 
multiple clients enriching and querying the corpora as needed.  ISCAN contains functionality for installing/starting/stopping 
the databases that PolyglotDB (the Python API) uses, as well as running most functionality for enriching and querying
corpora via a web interface or REST calls.

This package is intended to be used by developers who wish to extend functionality or contribute to the code.  For installation
instructions for a fully operational ISCAN server, please see the [ISCAN SPADE server repository](https://github.com/MontrealCorpusTools/iscan-spade-server)
for an example configuration and more instructions.


