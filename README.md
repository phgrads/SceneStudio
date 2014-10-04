WebSceneStudio
==============

Installation / Setup  (local development)
--------------
0. Get Ruby if not already installed (http://rubyinstaller.org/ for Windows, or follow https://www.digitalocean.com/community/articles/how-to-install-ruby-on-rails-on-ubuntu-12-04-lts-precise-pangolin-with-rvm for Ubuntu/Linux)

1. clone this repository onto your machine

2. get a copy of the `config/config.yml` file from your teammates or look at the `config/example.config.yml` file for some directions on how to create your own from scratch.  The values in this file are secrets, so you ABSOLUTELY don't want to put this file under version control or make it publicly available. For development purposes, set `HOST_BASE_URL` to `localhost:3000`.  For running on MTurk, make sure the `HOST_BASE_URL` starts with `https:` and that you have a proper SSL certificate for your server.

3. download the model data directory and symlink it into `public/data`

4. run `bundle install` to get all the ruby gems you need.   If you have problems running `bundle install`, try removing your `Gemfile.lock`.

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

2. Take a look at the generated skeleton and get a feel for what everything
   does.  Make sure to update the `config/experiments/sampleName.yml` with your configuration.

3. run `rake mturk:develop[sampleName]` to create the database entries for the
   experiment and run the setup script. You can develop locally by providing
   a param to the appropriate address (e.g. `mturk/task?assignmentId=xxx&workerId=yyy&hitId=sampleName`  or `experiments/sampleName?task_id=7`)

4. run `rake mturk:run[sampleName]` in order to launch the experiment
   you just created on the MTurk sandbox.

5. go to the worker sandbox (https://workersandbox.mturk.com/) and try doing your new task.

6. After running a task, you can do `rake mturk:recall[sampleName]` to approve all workers 
   and withdraw the task from Amazon Mturk.  WARNING: This will remove all evidence of the
   hit from Amazon as well make it hard to adjust payment for Turkers.  The data tables
   for the task is retains so your results are still there.  For development, you 
   may want to wipe out those tables too.  To do so, you can do `rake mturk:destroy[sampleName]` 
   to completely destroy all evidence of having run the experiment.  WARNING:
   If you do this in production you will lose all your experiment data.
   This is a bad idea, and will make it hard/impossible to audit yourself later.

7. When you're done playing around, make sure to get rid of all these junky
   template files for the `sampleName` task by running
   `rails destroy experiment sampleName`

8. Now go ahead and create an experiment with an actual name!

9. For more experiment management commands run `rake --tasks` or
   look at the `lib/tasks/mturk.rake` file

Existing Mechanical Turk Tasks
--------------

We currently have the following mechanical turk tasks.  You can find which tasks you have in your database by going to `mturk/tasks`.

### desc2scene
Ask users to create a scene based on a textual description.

After running task, go to `experiments/desc2scene/results` to view results.

### image2scene
Ask users to create a scene based on a image.

After running task, go to `experiments/image2scene/results` to view results.

### select-view
Ask users to select a BEST and a WORST view for a scene.

After running task, go to `experiments/select-view/results` to view results.

Troubleshooting
--------------

### Problem setting up a new server
* Error during `bundle install`.

  Try removing your `Gemfile.lock`

* Error precompiling assets.

  Check that your ruby version is `ruby-1.9.3`.  
  Use [rvm](https://www.digitalocean.com/community/tutorials/how-to-use-rvm-to-manage-ruby-installations-and-environments-on-a-vps) to manage and install `ruby-1.9.3`.


* You just set up a new server, and everything should be working, but you get "The page you were looking for doesn't exist."

  If you have been testing with a different instance, try a different browser or incognito mode.  You were probably logged in, and the new server doesn't know about that user.  If incognito mode works, create a user and login.
 





