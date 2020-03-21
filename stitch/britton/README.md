# Stitch Import

## Importing the Coronavirus Application from GitHub

*Solution Architect Author*: [Britton LaRoche](mailto:britton.laroche@mongodb.com)

There are many ways to deploy with stitch and to integrate Atlas with Devops.

Please see the following links for detailed instructions:

**Blog Overview** 
- https://www.mongodb.com/blog/post/mongodb-stitch-command-line-interface

**Atlas DevOps**
- https://www.mongodb.com/what-is-devops 
- https://www.mongodb.com/presentations/devops-with-mongodb

**Stitch Deployment Options**
- https://docs.mongodb.com/stitch/deploy/

The following section shows how to import the application via this GitHub and the stitch command line tool **"stitch-cli"**. Knowledge of how the stitch command line works is important as you can integrate stitch-cli with your CICD (continuous integration and continuous delivery) tools. This allows you to work in your native development environment, commit changes to GitHub and then deploy and test as you would normally through your CICD work flow.

The directions here are terse but complete as I refer you to documentation on setting up the stitch command line interface tool and importing the existing stitch shipping application:

### 1. Install the stitch-cli tool
Begin by [Installing the Stitch Command Line Interface tool](https://docs.mongodb.com/stitch/import-export/stitch-cli-reference/)

### 2. Creat a project API key
Next [Create a Project API key](https://docs.atlas.mongodb.com/configure-api-access/#programmatic-api-keys). When you create the API key be sure to give yourself the **"Project Owner"** role as you will need this to import the stitch application.

Right click this link [Create a Project API key](https://docs.atlas.mongodb.com/configure-api-access/#programmatic-api-keys) open in new tab. Follow instruction under **Manage Programmatic Access to a Project** perform each step listed in the section **Create an API Key for a Project** be sure to copy the private API key somewhere safe for future reference.

### 3. Download the GitHub code
Export the MongoDB Demos as a zip file from https://github.com/MaBeuLux88/coronavirus-mongodb. Press the green button in the upper right labeled **"Clone Or Download"** and press the download a zip file link.

### 4. Extract the zip file
Extract the zip file to the directory you installed the stitch-cli tool. The coronavirus application stitch export is located under (stitch-cli path)/MaBeuLux88/coronavirus-mongodb/edit/master/stitch/britton/example

### 5. Log in via stitch-cli
log into your atlas cluster with your API key (public and pprivate keys) with the Stitch command line tool.

Sample login instructions:
```
stitch-cli login --api-key=my-api-key --private-api-key=my-private-api-key
```

Example login:
```
stitch-cli login --api-key=abcictxq --private-api-key=1234b567-4a36-4197-a3c7-23b73ba49775
← you have successfully logged in as abcictxq ←
```

### 6. Import the coronavirus application
After logging in the command line maintains the connection until you execute the command **stitch-cli logout**. We are now ready to import the application. The following command below should work.
```
stitch-cli import --app-id=corona-fohlv --path=./MaBeuLux88/coronavirus-mongodb/edit/master/stitch/britton/example --strategy=replace
```

Follow the prompts and respond **y** when asked if you would like to create a new app. Press enter to accept the default values. Change the values to match your configuration. An example is provided below.

```
stitch-cli import --app-id=corona-fohlv --path=./MaBeuLux88/coronavirus-mongodb/edit/master/stitch/britton/example --strategy=replace
← Unable to find app with ID: "corona-fohlv": would you like to create a new app? [y/n]: ← y
← App name [coronavirus]: ←
← Available Projects: ←
← Project 0 - 5ce58a9fc56c98145d922e93 ←
← Atlas Project Name or ID [Project 0]: ←
← Location [US-VA]: ←
← Deployment Model [GLOBAL]: ←
← New app created: coronavirus-vibtf ←
← Importing app... ←
← Done. ←
← Successfully imported 'coronavirus-vibtf' ←

stitch-cli logout

```

If you named your cluster anything other than the default **"DevCluster"** then you will need to modify a json document to reflect your cluster name. The document is located in your directory here: /MaBeuLux88/coronavirus-mongodb/edit/master/stitch/britton/example/services/mongodb-atlas/config.json

If you named your cluster "DevCluster" for example you would change the **"clusterName":** field from **"Cluster0"** to **"DevCluster"**. An example has been provided below.

```

{
    "id": "5d218cb4e0601bec3de065c7",
    "name": "mongodb-atlas",
    "type": "mongodb-atlas",
    "config": {
        "clusterName": "DevCluster",
        "readPreference": "primary",
        "wireProtocolEnabled": false
    },
    "version": 1
}
```
Once you save your changes you are ready to try the import again.
