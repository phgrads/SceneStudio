WebSceneStudio
==============

Installation / Setup  (local development)
--------------
1. clone this repository onto your machine

2. get a copy of the `config/config.yml` file from your teammates or look at the `config/example.config.yml` file for some directions on how to create your own from scratch.  The values in this file are secrets, so you ABSOLUTELY don't want to put this file under version control or make it publicly available.

3. download the model data directory and symlink it into `public/data`

4. run `bundle install` to get all the ruby gems you need

5. run `rake db:migrate` to build/update the database

6. run `rails server` to start an instance of the server running at `localhost:3000`.  Point your browser here to visit the app.

