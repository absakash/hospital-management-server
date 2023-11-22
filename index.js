require('dotenv').config()

const express = require('express');
const cors=require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app=express()
app.use(cors())
  
app.use(express.json())
  
const port=process.env.PORT || 4000

app.get('/',async(req,res)=>{
    res.send('the router is going on ........')
})
const password=process.env.password
// console.log(password)


const uri = `mongodb+srv://volunteer:${password}@cluster0.5mwmpl3.mongodb.net/?retryWrites=true&w=majority`
  
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

function verifyJWT(req,res,next){
    const authHeader=req.headers.authorization;
    if(!authHeader){
      return res.status(401).send('unauthorized access')
    }
    const token= authHeader.split(' ')[1];

    jwt.verify(token,process.env.accessToken,function(err,decoded){
      if(err){
        return res.send({message:'forbidden access'})
      }
      req.decoded=decoded
      next()
    })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const DbAppointment=client.db('doctorsPortal').collection('appointmentDetails')
    const Books=client.db('doctorsPortal').collection('Book')
    const userCollection=client.db('doctorsPortal').collection('users')
    const doctorCollection=client.db('doctorsPortal').collection('doctors')


    app.get('/appoint',async(req,res)=>{
        const query={}
        const date=req.query.date;
    
        const option=await DbAppointment.find(query).toArray();
        //booking query 
        const bookingQuery={data:date}
        const alreadyBooked=await Books.find(bookingQuery).toArray()
        option.forEach(opt=>{
          const optionBooked=alreadyBooked.filter(book=>book.tname===opt.name)
          const bookedSlot=optionBooked.map(book=>book.slot)
          const remainingSlots=opt.slots.filter(slot=>!bookedSlot.includes(slot))
          opt.slots=remainingSlots
          console.log(date,opt.name,remainingSlots.length)
        })
        res.send(option)  
    })

    // app.post('/booking',async(req,res)=>{
    //     const bookings=req.body;
    //     console.log(bookings)
    //     const result=await BookingCollection.insertOne(bookings)
    //     res.send(result)
    // })

    app.post('/booking',async(req,res)=>{
        const booked=req.body;
        const result=await Books.insertOne(booked)
        res.send(result)
    })

    app.get('/booking',async(req,res)=>{
       // const date=req.query.date;
        const email=req.query.email;
        // console.log("token",req.headers.authorization)

        // const decodedEmail=req.decoded.email;
        // if(email !== decodedEmail){
        //   return res.send({message:'forbidden access....'})
        // }
        const query={email : email}
        const result=await Books.find(query).toArray()
        res.send(result)
    })

    app.get('/users',async(req,res)=>{
      const query={};
      const users=await userCollection.find(query).toArray();
      res.send(users);
    }) 

    app.get('/jwt',async(req,res)=>{
      const email=req.query.email;
      const query={email: email}
      const user=await userCollection.findOne(query)
      if(user){
        const token=jwt.sign({email},process.env.accessToken,{ expiresIn: '5h' })
        return res.send({access_token: token})
      }
      res.status(403).send({access_token:"unauthorised"})
      console.log(user)
    })


    app.post('/users',async(req,res)=>{
      const user=req.body;

      const result=await userCollection.insertOne(user);
      console.log(result)
      res.send(result)
    })

    app.get('/users/admin/:email',async(req,res)=>{
      const email=req.params.email;
      const query={email}
      const result=await userCollection.findOne(query);
      res.send({isAdmin: result?.role==='admin'})
    })

    app.put('/users/admin/:id',verifyJWT,async(req,res)=>{
      const decodedEmail=req.decoded.email;
      const query={email: decodedEmail}
      const user=await userCollection.findOne(query)
      if(user?.role !== 'admin'){
        return res.status(403).send({message:'forbidded acceso puto'})
      }        

      const id=req.params.id;
      const filter={_id:new ObjectId(id)}
      const options={upsert: true}
      const updateDoc={
        $set:{
          role:'admin'
        }
      }

      const result=await userCollection.updateOne(filter,updateDoc,options)
      res.send(result)
    })

    app.get('/appointmentSpecialist',async(req,res)=>{
      const query={}
      const result=await DbAppointment.find(query).project({name:1}).toArray()
      res.send(result)
    })



    app.post('/doctors',async(req,res)=>{
      const doctor=req.body;
      const result=await doctorCollection.insertOne(doctor);
      res.send(result)
      console.log(doctor);
    })

    app.get('/doctors',async(req,res)=>{
      const query={}
      const result=await doctorCollection.find(query).toArray()
      res.send(result)
    })

    app.delete('/doctors/:id',async(req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const result=await doctorCollection.deleteOne(filter)
      res.send(result)
    })
  //  temporary updating the price 

  // app.get('/addPrice',async(req,res)=>{
  //     const filter={}
  //     const options={upsert: true}
  //     const updateDoc={
  //       $set: {
  //         price: 99
  //       }
  //     }

  //     const result= await DbAppointment.updateMany(filter,updateDoc,options)
  //     res.send(result)
  // })


  app.get('/booking/:id',async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}
    const result=await Books.findOne(query)
    res.send(result)
  })
 
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    //   that the client will close when you finish/error
   
  }
}
run().catch(console.dir);











app.listen(port,()=>{
    console.log(`port is running at ${port}`)
})
 