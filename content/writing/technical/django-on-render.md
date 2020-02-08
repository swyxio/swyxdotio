---
title: How To Deploy a Django App to Render.com
slug: django-on-render
categories: ['Python']
date: 2020-02-07
description: Messing around learning Django and deploying
---

I pottered around a bit with Django today, blasting through [the tutorial](https://docs.djangoproject.com/en/3.0/intro/tutorial01/). However [the deployment section](https://docs.djangoproject.com/en/3.0/howto/deployment/) was rather impenetrable for someone who doesn't even know what WSGI stands for. 

I figured I should try deploying it to [Render.com](http://render.com/) to learn both.

## TL;DR

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Steps

The official [Render tutorial for Django](https://render.com/docs/deploy-django) uses PostGres, which means the web server and database takes up your two free deployments. It also [had issues when I tried it](https://github.com/render-examples/django-quick-start/issues/1). So I wanted to try a "from scratch" Django project, from the official tutorial, using SQLite.

1. Going through the whole tutorial will get you something like https://github.com/sw-yx/django-quick-start. I modified `mysite` a bit to add a nicer landing page. Commit it to a GitHub repo.
2. [Go to your Render dashboard and start a new web service](https://dashboard.render.com/select-repo?type=web).
3. Make sure to configure the necessary commands and env vars:

- `DJANGO_SECRET_KEY`: something strong. can generate with `echo "$(openssl rand -base64 32)"`
- Build command: `./build.sh` - this script, not from the tutorial, installs Python's `requirements.txt` - i'm not totally sure if this is needed, I copied it from https://github.com/render-examples/django-quick-start/ so I assume it is
- Start command: `cd mysite && gunicorn mysite.wsgi:application`. Note the `cd mysite` is just because of the filestructure of my project I had set up. A "professional" project would presumably be a little flatter. You will note the weird syntax of `mysite.wsgi:application` - `application` is the variable where the WSGI callable is stored.

I had previously [tried and failed](https://github.com/render-examples/django-quick-start/issues/1) to use Render's Django Quick Start repo, so if you had `DJANGO_SETTINGS_MODULE` set to `config.settings.production`, Django will be looking for a file that doesn't exist and fail nastily. Delete it.

With that, your Django app should be up and running. Mine is deployed at: https://django-test-9g3f.onrender.com/ and you can see the stateful voting app in action at https://django-test-9g3f.onrender.com/polls. https://django-test-9g3f.onrender.com/admin also works.

## Render.yaml

IAAC is important for scaling/reproducability, and a nice one click deploy experience. The docs aren't fully fleshed out yet but fortunately there is [a decent sample YAML file published](https://render.com/docs/yaml-spec). I was also able to find plenty of examples by [searching GitHub](https://github.com/search?q=filename%3Arender.yaml&type=Code).

```yaml
services: 
- type: web
  name: djangotutorial
  env: python
  buildCommand: "./build.sh"        # ensure it's a string
  startCommand: cd mysite && gunicorn mysite.wsgi:application
  repo: https://github.com/sw-yx/django-quick-start.git # optional
  # plan: standard # optional
  healthCheckPath: /
  # autoDeploy: false             # optional
  envVars:
  - key: DJANGO_SECRET_KEY
    generateValue: true       # will generate a base64-encoded 256-bit secret
```

## Failures and Todos

You'll observe that all static assets fail to load in production, despite it working in local development. I reckon this is some misconfiguration of the static assets finding that I did. The official example has [other static file finding strategies](https://github.com/render-examples/django-quick-start/blob/c48c0ced13ed6a17c2708334548f248a0763a531/config/settings/base.py#L140-L154) i have yet to explore.

## Misc

I made this dump of Render's env vars, which I figured I could use in my application code: 

```js
{
  KUBERNETES_SERVICE_PORT_HTTPS: '443',
  PIPENV_VENV_IN_PROJECT: 'true',
  KUBERNETES_SERVICE_PORT: '443',
  BLACK: '\x1b[30m',
  RENDER_SERVICE_CONTEXT_ROOT: '/opt/render/project/src',
  PIPENV_QUIET: 'true',
  HOSTNAME: 'srv-bosg45n8jd5vhm4jst80-77f6f7f849-v7gcc',
  IS_PULL_REQUEST: 'false',
  USER_RUN_COMMAND: 'cd mysite && gunicorn mysite.wsgi:application',
  PYTHON_VERSION: '3.7.6',
  NPM_CONFIG_CACHE: '/opt/render/.cache',
  RENDER_NODE_INSTALLED: 'true',
  DJANGO_SECRET_KEY: 'REDACTED',
  ENTER_STANDOUT: '\x1b[7m',
  BLUE: '\x1b[34m',
  WHITE: '\x1b[37m',
  NODE_VERBOSE: 'false',
  CYAN: '\x1b[36m',
  YARN_CACHE_FOLDER: '/opt/render/.cache',
  RENDER_EXTERNAL_HOSTNAME: 'django-test-9g3f.onrender.com',
  RENDER_PRE_RUN_COMMAND: 'source /opt/render/project/src/.venv/bin/activate',
  RENDER_GIT_REPO_SLUG: 'sw-yx/django-quick-start',
  PWD: '/opt/render/project/src/mysite',
  RENDER_ROOT: '/opt/render',
  RENDER: 'true',
  DEFAULT_NODE_VERSION: '12.13.0',
  PORT: '10000',
  NODE_ENV: 'production',
  PIPENV_YES: 'true',
  YELLOW: '\x1b[33m',
  RESET: '\x1b(B\x1b[m',
  GUNICORN_CMD_ARGS: '--preload --access-logfile - --bind=0.0.0.0:10000',
  NPM_CONFIG_DEVDIR: '/opt/render/.cache',
  PIPENV_CACHE_DIR: '/opt/render/.cache',
  HOME: '/opt/render',
  RENDER_EXTERNAL_URL: 'https://django-test-9g3f.onrender.com',
  LANG: 'C.UTF-8',
  KUBERNETES_PORT_443_TCP: 'tcp://10.131.0.1:443',
  VIRTUAL_ENV: '/opt/render/project/src/.venv',
  RENDER_PM_DIR: '/opt/render/project/src',
  RENDER_SERVICE_TYPE: 'web',
  VIRTUAL_ENV_DISABLE_PROMPT: 'true',
  GPG_KEY: '0D96DF4D4110E5C43FBFB17F2D347EA6AA65421D',
  TMPDIR: '/tmp',
  FORWARDED_ALLOW_IPS: '*',
  MAGENTA: '\x1b[35m',
  PIP_CACHE_DIR: '/opt/render/.cache',
  BOLD: '\x1b[1m',
  XDG_CACHE_HOME: '/opt/render/.cache',
  NODES_ROOT: '/opt/render/project/nodes',
  TERM: 'xterm-256color',
  RENDER_INTERNAL_IP: '10.104.65.37',
  NPM_CONFIG_LOGLEVEL: 'error',
  RENDER_GIT_BRANCH: 'master',
  RENDER_GIT_COMMIT: 'f9f9d37069642bfd32c762d00c6e4e74ce329a65',
  VENV_ROOT: '/opt/render/project/src/.venv',
  RENDER_SERVICE_NAME: 'django-test-9g3f',
  SHLVL: '0',
  KUBERNETES_PORT_443_TCP_PROTO: 'tcp',
  PYTHON_PIP_VERSION: '20.0.2',
  KUBERNETES_PORT_443_TCP_ADDR: '10.131.0.1',
  RENDER_ENV: 'python-3',
  RENDER_INTERNAL_HOSTNAME:
    'srv-bosg45n8jd5vhm4jst80.usr-bosfgpn8jd5vhm4jsorg.svc.cluster.local',
  RENDER_DISCOVERY_SERVICE: 'django-test-9g3f-discovery',
  RENDER_DIR: 'render',
  WEB_CONCURRENCY: '4',
  RED: '\x1b[31m',
  RENDER_PROJECT_DIR: 'project',
  PYTHON_GET_PIP_SHA256:
    'da288fc002d0bb2b90f6fbabc91048c1fa18d567ad067ee713c6e331d3a32b45',
  EXIT_STANDOUT: '\x1b[27m',
  KUBERNETES_SERVICE_HOST: '10.131.0.1',
  LC_ALL: 'C.UTF-8',
  KUBERNETES_PORT: 'tcp://10.131.0.1:443',
  KUBERNETES_PORT_443_TCP_PORT: '443',
  PYTHON_GET_PIP_URL:
    'https://github.com/pypa/get-pip/raw/42ad3426cb1ef05863521d7988d5f7fec0c99560/get-pip.py',
  PATH:
    '/opt/render/project/src/.venv/bin:/opt/render/project/src/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  RENDER_PM_ROOT: '/home/render',
  GREEN: '\x1b[32m',
  RENDER_POD_NAME: 'srv-bosg45n8jd5vhm4jst80-77f6f7f849-v7gcc',
  NODE_VERSION: '',
  NODE_MODULES_CACHE: 'true',
  RENDER_PROJECT_ROOT: '/opt/render/project',
  DEBIAN_FRONTEND: 'noninteractive',
  OLDPWD: '/opt/render/project/src',
  RENDER_SRC_ROOT: '/opt/render/project/src',
  _: '/opt/render/project/src/.venv/bin/gunicorn',
  SERVER_SOFTWARE: 'gunicorn/20.0.4',
  DJANGO_SETTINGS_MODULE: 'mysite.settings'
}
```