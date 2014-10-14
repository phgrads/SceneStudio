SceneStudio::Application.routes.draw do

  # Mturk tasks
  get 'experiments/enrich_scene', to: 'experiments/enrich_scene#index'
  get 'experiments/enrich_scene/results', to: 'experiments/enrich_scene#results'
  match 'experiments/enrich_scene/:id/load',         to: 'experiments/enrich_scene#load'
  match 'experiments/enrich_scene/:id/view',         to: 'experiments/enrich_scene#view'

  get 'experiments/scene2desc', to: 'experiments/scene2desc#index'
  get 'experiments/scene2desc/results', to: 'experiments/scene2desc#results'
  match 'experiments/scene2desc/:id/load',         to: 'experiments/scene2desc#load'
  match 'experiments/scene2desc/:id/view',         to: 'experiments/scene2desc#view'

  get 'experiments/select_view', to: 'experiments/select_view#index'
  get 'experiments/select_view/results', to: 'experiments/select_view#results'
  match 'experiments/select_view/:id/load',         to: 'experiments/select_view#load'
  match 'experiments/select_view/:id/view',         to: 'experiments/select_view#view'

  get 'experiments/recon2scene', to: 'experiments/recon2scene#index'
  get 'experiments/recon2scene/results', to: 'experiments/recon2scene#results'
  match 'experiments/recon2scene/:id/load',         to: 'experiments/recon2scene#load'
  match 'experiments/recon2scene/:id/view',         to: 'experiments/recon2scene#view'

  get 'experiments/image2scene', to: 'experiments/image2scene#index'
  get 'experiments/image2scene/results', to: 'experiments/image2scene#results'
  match 'experiments/image2scene/:id/load',         to: 'experiments/image2scene#load'
  match 'experiments/image2scene/:id/view',         to: 'experiments/image2scene#view'

  get 'experiments/desc2scene', to: 'experiments/desc2scene#index'
  get 'experiments/desc2scene/results', to: 'experiments/desc2scene#results'
  match 'experiments/desc2scene/:id/load',         to: 'experiments/desc2scene#load'
  match 'experiments/desc2scene/:id/view',         to: 'experiments/desc2scene#view'

  # Main app
  root                              to: 'static_pages#home'
  match '/help',                    to: 'static_pages#help'

  # login / logout etc.
  match '/signin',                  to: 'sessions#new'
  match '/signup',                  to: 'identities#new'
  match '/auth/:provider/callback', to: 'sessions#create'
  match '/auth/failure',            to: 'sessions#failure'
  match '/signout',                 to: 'sessions#destroy', :as => :signout

  resources :scenes, only: [:index, :create, :edit, :update, :destroy]
  match '/scenes/:id/load',         to: 'scenes#load'
  match '/scenes/:id/view',         to: 'scenes#view'

  # mTurk
  get '/mturk/task',                to: 'mturk#task'
  get '/mturk/tasks',               to: 'mturk#tasks'
  get '/mturk/assignments',         to: 'mturk#assignments'
  post '/mturk/report',             to: 'mturk#report'
  post '/mturk/coupon',             to: 'mturk#coupon'
  post '/mturk/report_item',        to: 'mturk#report_item'
  post '/mturk/destroy_item',       to: 'mturk#destroy_item'


  #resources :identities

  #match "/home", to: "static_pages/home"

  # The priority is based upon order of creation:
  # first created -> highest priority.

  # Sample of regular route:
  #   match 'products/:id' => 'catalog#view'
  # Keep in mind you can assign values other than :controller and :action

  # Sample of named route:
  #   match 'products/:id/purchase' => 'catalog#purchase', :as => :purchase
  # This route can be invoked with purchase_url(:id => product.id)

  # Sample resource route (maps HTTP verbs to controller actions automatically):
  #   resources :products

  # Sample resource route with options:
  #   resources :products do
  #     member do
  #       get 'short'
  #       post 'toggle'
  #     end
  #
  #     collection do
  #       get 'sold'
  #     end
  #   end

  # Sample resource route with sub-resources:
  #   resources :products do
  #     resources :comments, :sales
  #     resource :seller
  #   end

  # Sample resource route with more complex sub-resources
  #   resources :products do
  #     resources :comments
  #     resources :sales do
  #       get 'recent', :on => :collection
  #     end
  #   end

  # Sample resource route within a namespace:
  #   namespace :admin do
  #     # Directs /admin/products/* to Admin::ProductsController
  #     # (app/controllers/admin/products_controller.rb)
  #     resources :products
  #   end

  # You can have the root of your site routed with "root"
  # just remember to delete public/index.html.
  # root :to => 'welcome#index'

  # See how all your routes lay out with "rake routes"

  # This is a legacy wild controller route that's not recommended for RESTful applications.
  # Note: This route will make all actions in every controller accessible via GET requests.
  # match ':controller(/:action(/:id))(.:format)'
end
