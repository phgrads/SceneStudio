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

Deployment (Apache + Passenger)
----------
0. Follow steps 1 - 5 as above (more convenient if checkout is through https and into a shared folder such as `/home/shared`)
1. make sure the checked out repository has permissions allowing access by apache process (ensure group ownership is set to `www-pub`)
2. create symlink in active apache DocumentRoot path (usually `/var/www/`) pointing to the `SceneStudio/public` directory
3. install Phusion Passenger: `gem install passenger` ([documentation](http://www.modrails.com/documentation/Users%20guide%20Apache.html))
4. install passenger module for Apache: `passenger-install-apache2-module` and follow directions to modify apache files
5. add a block of the following form into the active Apache site virtual host (currently `/etc/apache2/sites-available/default`):

   ```
   RackBaseURI /scenestudio
   RackEnv production
   PassengerAppRoot /path/to/SceneStudio/
   <Directory /var/www/scenestudio>
    	Options -MultiViews
   </Directory>
   # Proxy for solr used by SceneStudio
   ProxyPass /scenestudio/solr http://localhost:8983/solr
   ProxyPassReverse /scenestudio/solr http://localhost:8983/solr
   ```

6. Before running in the production environment, make sure to precompile assets through:

    ```
    RAILS_RELATIVE_URL_ROOT="/scenestudio" bundle exec rake assets:clean
    RAILS_RELATIVE_URL_ROOT="/scenestudio" bundle exec rake assets:precompile
    ```
7. Restart apache server using `sudo service apache2 restart`


How to create a new Mechanical Turk Experiment/Task and Manage It
--------------

The following assumes that we are running in development mode on a local machine.

1. run `rails generate experiment sampleName` to generate some skeleton files.
   The skeleton files will be usable out of the box, so try that first.

2. run `rake mturk:run[sampleName]` in order to launch the experiment
   you just created on the MTurk sandbox.

3. go to the worker sandbox and try doing your new task.

4. Take a look at the generated skeleton and get a feel for what everything
   does.

5. You can only run a particular task once!  However, that's not so great
   for development.  So, you can just `rake mturk:recall[sampleName]` to
   completely destroy all evidence of having run the experiment.  WARNING:
   If you do this in production you will lose all your experiment data.
   This is a bad idea, and will make it hard/impossible
   to audit yourself later.

6. When you're done playing around, make sure to get rid of all these junky
   template files for the `sampleName` task by running
   `rails destroy experiment sampleName`

7. Now go ahead and create an experiment with an actual name!

8. For more experiment management commands run `rake --tasks` or
   look at the `lib/tasks/mturk.rake` file
