# ISCAN

[![Build Status](https://travis-ci.org/MontrealCorpusTools/iscan-server.svg?branch=master)](https://travis-ci.org/MontrealCorpusTools/iscan-server)
[![Coverage Status](https://coveralls.io/repos/github/MontrealCorpusTools/iscan-server/badge.svg?branch=master)](https://coveralls.io/github/MontrealCorpusTools/iscan-server?branch=master)

## Introduction

ISCAN (Integrated Speech Corpus ANalysis) is a tool to manage and analyze corpora on a single server with support for multiple clients enriching and querying the corpora as needed.  The ISCAN server contains tools to install/start/stop the databases that PolyglotDB (the Python API) uses.

Additionally, the ISCAN server is used to manage multiple different Polyglot databases, so users can isolate corpora as needed, and start and stop databases as they need access to them.

**Note**: At the moment, iscan-server is only supported on Ubuntu.

