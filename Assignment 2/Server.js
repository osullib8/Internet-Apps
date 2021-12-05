"use strict";
const express = require('express')
const app = express()
const port = 3000
var AWS = require("aws-sdk");
var fs = require('fs');

const path=require("path")
let publicPath= path.resolve(__dirname,"public")
app.use(express.static(publicPath))

app.get('/create', createDB);
app.get('/query/:year/:title', queryDB);
app.get('/destroy', destroyDB);

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

const creds = new AWS.Credentials();

AWS.config.update({
  region: "eu-west-1",
  credentials: creds 
});

var dynamodb = new AWS.DynamoDB();

async function createDB(req, res){
    var paramsCreate = {
        TableName : "Movies",
        KeySchema: [       
            { AttributeName: "year", KeyType: "HASH"},  //Partition key
            { AttributeName: "title", KeyType: "RANGE" }  //Sort key
        ],
        AttributeDefinitions: [       
            { AttributeName: "year", AttributeType: "N" },
            { AttributeName: "title", AttributeType: "S" },
        ],
        ProvisionedThroughput: {       
            ReadCapacityUnits: 1, 
            WriteCapacityUnits: 1
        }
    };

    var paramsBucket = {
        Bucket: 'csu44000assignment220',
        Key: 'moviedata.json'
    }
    var s3 = new AWS.S3();

    let created = "";

    dynamodb.createTable(paramsCreate, async function(err, data) {
        if (err) {
            console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
            created = "Unable to create table"
        } else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            created ="Table created"
        }
    });

    const backoffInterval = 5000 // 5 seconds

    const waitForTable = TableName =>
    dynamodb.describeTable({TableName: "Movies"}).promise().then(data => {
        if (data.Table.TableStatus !== "ACTIVE") {
            console.log(`Table status: ${data.Table.TableStatus}, retrying in ${backoffInterval}ms...`)
            return new Promise(resolve => {
            setTimeout(() => waitForTable().then(resolve), backoffInterval)
            })
        } else {
            return
        }}).catch(error => {
        console.warn(
            `Table not found! Error below. Retrying in ${backoffInterval} ms...`,
            error)
        return new Promise(resolve => {
            setTimeout(() => waitForTable().then(resolve), backoffInterval) })
        })

    waitForTable("Movies").then(() => {
        created = created + "Table populating"
        console.log(created)
        console.log("Importing movies into DynamoDB. Please wait.");
        obj = s3.getObject(paramsBucket, function(err, data) {
            if (err) {
                console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                var docClient = new AWS.DynamoDB.DocumentClient();

                var allMovies = JSON.parse(data.Body);
                allMovies.forEach(function(movie) {
                    console.log(movie)
                    var params = {
                        TableName: "Movies",
                        Item: {
                            "year":  movie.year,
                            "title": movie.title,
                            "info": movie.info
                        }
                    };
                    console.log(params)
                    docClient.put(params, function(err, data) {
                    if (err) {
                        console.error("Unable to add movie", movie.title, ". Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        console.log("PutItem succeeded:", movie.title);
                    }
                    });
                });
            }
        });
    })
    console.log("return here")
    res.json({ created: created})
};

function queryDB(req, res){
    let release_year = parseInt(req.params.year);
    let release_title = req.params.title;
    let title = [];
    let year = [];
    let rating = [];
    let release_date = [];
    let rank = [];

    console.log(release_year)
    var params = {
        TableName : "Movies",
        ProjectionExpression:"#yr, title, info",
        KeyConditionExpression: "#yr = :yyyy and begins_with( title , :begin)",
        ExpressionAttributeNames:{
            "#yr": "year",
        },
        ExpressionAttributeValues: {
            ":yyyy": release_year,
            ":begin": release_title,
        }
    };

    var docClient = new AWS.DynamoDB.DocumentClient();

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            data.Items.forEach(function(item) {
                console.log(" -", item.year + ": " + item.title + " ... " + item.info.rating + " ... " + item.info.rank  + " ... " + item.info.release_date);
                title.push(item.title);
                year.push(item.year);
                rating.push(item.info.rating);
                rank.push(item.info.rank);
                release_date.push(item.info.release_date);
            });
        }
        res.json({title: title, year: year, rating: rating, rank: rank, release_date: release_date});
    });

}

function destroyDB(req, res){
    var Dynamodb = new AWS.DynamoDB();
    var paramsDestroy = {
        TableName : "Movies"
    };
    let destroy = "";
    Dynamodb.deleteTable(paramsDestroy, function(err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
            destroy = "Unable to destroy";
            res.json({destroy: destroy})
        } else {
            console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
            destroy = "Table detroyed";
            res.json({destroy: destroy})
        }
    });
}