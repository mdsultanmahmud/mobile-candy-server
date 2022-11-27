const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const jwt = require('jsonwebtoken')

require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// middlewear 
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Mobile Candy server is running')
})

app.listen(port, () => {
    console.log('server is running from port:', port)
})


// verify access token 
const verifyJWT = async (req, res, next) => {
    const authHeaders = req.headers.authorization_token
    if (!authHeaders) {
        return res.status(401).send({
            success: false,
            message: 'Unauthorized Access'
        })
    }

    const token = authHeaders.split(' ')[1]
    jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                success: false,
                message: 'Unauthorized Access'
            })
        }

        req.decoded = decoded
        next()
    })
}


// mongo db starts here

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p11nzlu.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const Users = client.db('MobileCandyDB').collection('users')
    const Products = client.db('MobileCandyDB').collection('products')
    const Categories = client.db('MobileCandyDB').collection('categories')
    const AdvertisedProducts = client.db('MobileCandyDB').collection('advertisedProducts')
    const Bookings = client.db('MobileCandyDB').collection('bookings')
    const PaymentsItem = client.db('MobileCandyDB').collection('paymentsItem')
    const ReportedItems = client.db('MobileCandyDB').collection('reportedItems')
    // create json web token 
    app.get('/jwt', async (req, res) => {
        const userEmail = req.query.email
        const query = {
            email: userEmail
        }
        const user = await Users.findOne(query)
        if (!user) {
            return res.send({
                success: false,
                message: 'User is not available in database'
            })
        }
        const token = jwt.sign({ userEmail }, process.env.JWT_TOKEN, { expiresIn: '3h' })
        res.send({ accessToken: token })
    })

    // works with users 
    app.post('/users', async (req, res) => {
        const user = req.body
        const existUser = await Users.findOne({ email: user.email })
        if (existUser) {
            return
        }
        const result = await Users.insertOne(user)
        res.send(result)
    })
    app.get('/users/admin', async (req, res) => {
        const email = req.query.email
        const filter = {
            email: email
        }
        const user = await Users.findOne(filter)
        res.send(user)
    })
    // get all sellers 
    app.get('/sellers', async (req, res) => {
        const query = {
            role: 'Seller'
        }
        const result = await Users.find(query).toArray()
        res.send(result)
    })

    // get all buyers 
    app.get('/buyers', async (req, res) => {
        const query = {
            role: 'Buyer'
        }
        const result = await Users.find(query).toArray()
        res.send(result)
    })

    app.put('/users/verify/:id', async (req, res) => {
        const id = req.params.id
        const query = {
            _id: ObjectId(id)
        }
        const option = { upsert: true }
        const updatedUser = {
            $set: {
                isVerified: true
            }
        }
        const result = await Users.updateOne(query, updatedUser, option)
        res.send(result)

    })
    // works with products and products category 
    // create category api 
    // get all categories 
    app.get('/categories', async (req, res) => {
        const query = {}
        const result = await Categories.find(query).toArray()
        res.send(result)
    })
    app.get('/categories/:id', async (req, res) => {
        const id = req.params.id
        const query = {
            _id: ObjectId(id)
        }
        const result = await Categories.findOne(query)
        res.send(result)
    })
    // post a products
    app.post('/products', async (req, res) => {
        const product = req.body
        const result = await Products.insertOne(product)
        res.send(result)
    })

    // get products filter with products category 
    app.get('/products', async (req, res) => {
        const categoryName = req.query.category
        const query = {
            category: categoryName
        }
        const result = await Products.find(query).toArray()
        res.send(result)
    })

    // get prodcuts for seller 
    app.get('/productsByGmail', verifyJWT, async (req, res) => {
        const email = req.query.email
        const decodedEmail = req.decoded.userEmail
        if (email !== decodedEmail) {
            return res.status(401).send({
                success: false,
                message: 'Forbidden Access'
            })
        }
        const filter = {
            sellerEmail: email
        }
        const result = await Products.find(filter).toArray()
        res.send(result)
    })

    // make a product advertsed

    app.post('/productsAdvertised', async (req, res) => {
        const advertisedPro = req.body
        const result = await AdvertisedProducts.insertOne(advertisedPro)
        res.send(result)
    })

    // get advertised items list 
    app.get('/productsAdvertised', async (req, res) => {
        const query = {}
        const result = await AdvertisedProducts.find(query).toArray()
        const products = await Products.find(query).toArray()
        // let soldItem = products.filter(prd => prd?.status === 'sold');
        // let paidItem;
        // soldItem.map(advro =>{
        //     console.log(advro.availibility)
        //     paidItem = result.filter(sld => sld.availibility !== advro.availibility)
        // })

        // // const availableItem = result
        res.send(result)
    })


    // create apis for booking data 
    app.post('/booking', async (req, res) => {
        const bookedProduct = req.body
        const result = await Bookings.insertOne(bookedProduct)
        res.send(result)
    })
    app.get('/booking', verifyJWT, async (req, res) => {
        const userEmail = req.query.email
        const decodedEmail = req.decoded.userEmail
        if (userEmail !== decodedEmail) {
            return res.status(403).send({
                success: false,
                message: 'Forbidden access'
            })
        }
        const query = {
            email: userEmail
        }
        const result = await Bookings.find(query).toArray()
        res.send(result)
    })

    // get a specific booking items 
    app.get('/booking/:id', async (req, res) => {
        const id = req.params.id
        const query = {
            _id: ObjectId(id)
        }
        const result = await Bookings.findOne(query)
        res.send(result)

    })

    // payment method add 
    app.post('/create-payment-intent', async (req, res) => {
        const bookedPr = req.body
        const price = bookedPr.price
        const amount = price * 100
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            "payment_method_types": [
                "card"
            ]
        })

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    })


    app.post('/booked/payments', async (req, res) => {
        const paymentProducts = req.body
        const bookId = paymentProducts.bookedProductId
        const prodid = paymentProducts.productId
        const option = { upsert: true }
        const filter = {
            _id: ObjectId(bookId)
        }

        const filterProd = {
            _id: ObjectId(prodid)
        }
        const updateDoc = {
            $set: {
                availibility: false,
                transaction: paymentProducts.transactionId,
                status: 'sold'
            }
        }

        const product = await Products.updateOne(filterProd, updateDoc, option)
        const bookedprd = await Bookings.updateOne(filter, updateDoc, option)
        const result = await PaymentsItem.insertOne(paymentProducts)
        res.send(result)
    })


    // reported a product
    app.post('/reported', async (req, res) => {
        const reported = req.body
        const query = {
            email: reported.email,
            productId: reported. productId
        }
        const items = await ReportedItems.findOne(query)
        if(items){
            return res.send({
                acknowledged: false,
                message: 'You have already reported this product!'
            })
        }
        const result = await ReportedItems.insertOne(reported)
        res.send(result)
    })

    // get reported item 
    app.get('/reported', async(req, res) =>{
        const query = {}
        const result = await ReportedItems.find(query).toArray()
        res.send(result)
    })

}

run().catch(e => console.log(e))

