import mongoose from "mongoose";

export const connectdb=async()=>{

    try{
        const conn=await mongoose.connect(process.env.MONGOURI);
        console.log("MongoDB connected: ",conn.connection.host);
    }catch(error){
        console.log("error connecting in mongodb",error);
        process.exit(1);//1 means failure
    }
}
