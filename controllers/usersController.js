const User = require("../models/User");
const Note = require("../models/Note");
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password").lean();
  if (!users?.length) {
    return res.status(400).json({ message: "No users found" });
  }
  res.json(users);
};

const createUser = async (req, res) => {
  const { username, password, roles } = req.body;

  //Confirm data
  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  //Check for duplicate
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res
      .status(409)
      .json({ message: `Username '${username}' already exist` });
  }

  //Hash password
  const hashedPwd = await bcrypt.hash(password, 10); // salts rounds

  const userObject =
    !Array.isArray(roles) || !roles.length
      ? { username, password: hashedPwd }
      : { username, password: hashedPwd, roles };

  const user = await User.create(userObject);

  if (user) {
    //created
    res.status(201).json({ message: `New user ${username} created` });
  } else {
    res.status(400).json({ message: "Invalid user data received" });
  }
};

const updateUser = async (req, res) => {
  const { id, username, roles, active, password } = req.body;

  //confirm data
  if (
    !id ||
    !username ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  //check for duplicate
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  //allow original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res
      .status(409)
      .json({ message: `Username '${username}' already exist` });
  }

  user.username = username;
  user.roles = roles;
  user.active = active;

  if (password) {
    //hash password
    user.password = await bcrypt.hash(password, 10); //salt rounds
  }

  const updatedUser = await user.save();

  res.json({ message: `${updatedUser.username} updated` });
};

const deleteUser = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: "User ID required" });
  }

  const note = await Note.findOne({ user: id }).lean().exec();

  if (note) {
    return res.status(400).json({ message: "User has assigned notes" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: `User not found` });
  }

  const result = await user.deleteOne();

  const reply = `Username ${result.username} with ID ${result.id} deleted`;

  res.json(reply);
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
