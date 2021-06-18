# Boat Management REST API

This API was created for Oregon State University's CS493 final project. This REST API allows users to perform CRUD operations on boats and loads and manage the relationship between a boat and loads. 

All endpoints related to boats are protected and require that a user is authorized and authenticated by Auth0. 

This is accomplished by creating an account and logging in at https://cs493-final-project-315721.uc.r.appspot.com/ 

After a user creates an account an logs in, they are given a JWT and must provide that to the API in the Authorization header before endpoints related to boats can be accessed. Once the user is authorized and authenticated, CRUD operations can be performed on boats. 

Endpoints related to loads are not protected. 

For more information on the API specifications, please refer to the "API Documentation.pdf".

This API was created using Auth0, JavaScript, Node.JS, Google's Datastore, and is hosted on Google Cloud Platform.