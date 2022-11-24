const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
// middlewear 
app.use(cors())
app.use(express.json())

app.get('/', (req, res) =>{
    res.send('Mobile Candy server is running')
})

app.listen(port, () =>{
    console.log('server is running from port:', port)
})


// mongo db starts here

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p11nzlu.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    const Users = client.db('MobileCandyDB').collection('users')
    app.post('/users', async (req, res) =>{
        const user = req.body 
        const result = await Users.insertOne(user)
        res.send(result)
    })
}

run().catch(e => console.log(e))