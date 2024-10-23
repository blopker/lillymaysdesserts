start:
	bundle exec jekyll serve --host 0.0.0.0 --livereload

build:
	bundle exec jekyll build

install:
	bundle install

docker:
	docker run -it -v .:/app ruby:latest bash