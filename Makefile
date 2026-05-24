SHELL := /bin/bash
NVM := . ~/.nvm/nvm.sh && nvm use

.PHONY: install auth tf-init tf-apply emulators dev build deploy test

install:
	npm install -g firebase-tools
	npm install

auth:
	gcloud auth login
	gcloud auth application-default login

tf-init:
	cd terraform && terraform init

tf-apply:
	cd terraform && terraform apply

test:
	$(NVM) && npm test

dev-firebase:
	$(NVM) && firebase emulators:start --project demo-fitness-calendar --import=./emulator-data --export-on-exit=./emulator-data

dev-ui:
	$(NVM) && npm run dev

build:
	npm run build

deploy: build
	firebase deploy