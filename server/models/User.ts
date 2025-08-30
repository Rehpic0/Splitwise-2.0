import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  groups: Types.ObjectId[]; // Groups user is a member of
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  groups: [{ type: Schema.Types.ObjectId, ref: "Group" }]
});

export default mongoose.model<IUser>("User", UserSchema);