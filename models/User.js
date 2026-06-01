import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
 telegramId:{type:Number,unique:true},
 firstName:String,
 username:String,
 phone:String,
 createdAt:{type:Date,default:Date.now}
});
export default mongoose.model("User", userSchema);