start:
	bundle exec jekyll serve --livereload

build:
	bundle exec jekyll build

install:
	bundle install

docker:
	docker run -it -v .:/app ruby:latest bash