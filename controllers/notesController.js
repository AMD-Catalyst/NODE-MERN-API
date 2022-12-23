const Note = require("../models/Note");
const User = require("../models/User");

const getAllNotes = async (req, res) => {
  const notes = await Note.find().lean();

  if (!notes?.length) {
    return res.status(400).json({ message: "No Notes Found" });
  }

  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.user).lean().exec();
      if (user) {
        return { ...note, username: user.username };
      } else {
        return { ...note, username: "" };
      }
    })
  );

  res.json(notesWithUser);
};

const createNote = async (req, res) => {
  const { user, title, text } = req.body;

  if (!user || !title || !text) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const validUser = await User.findById(user).exec();

  if (!validUser) {
    return res.status(400).json({ message: `User is not valid` });
  }

  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res
      .status(400)
      .json({ message: `Note title '${title}' already exist` });
  }

  const note = await Note.create({ user, title, text });

  if (note) {
    res.status(201).json({ message: `New note created` });
  } else {
    res.status(400).json({ message: `Invalid note data received` });
  }
};

const updateNote = async (req, res) => {
  const { id, user, title, text, completed } = req.body;
  if (!id || !user || !title || !text || typeof completed !== "boolean") {
    return res.status(400).json({ message: `All fields are required` });
  }

  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  const validUser = await User.findById(user).exec();

  if (!validUser) {
    return res.status(400).json({ message: `User is not valid` });
  }

  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate && duplicate?._id.toString() !== id) {
    return res
      .status(409)
      .json({ message: `Note title '${title}' already exist` });
  }

  note.user = user;
  note.title = title;
  note.text = text;
  note.completed = completed;

  const updatedNote = await note.save();

  res.json(`'${updatedNote.title}' updated`);
};

const deleteNote = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: `Note ID required` });
  }

  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: `Note not found` });
  }

  const result = await note.deleteOne();

  const reply = `Note '${result.title}' with ID '${result._id}' deleted`;

  res.json(reply);
};

module.exports = {
  getAllNotes,
  createNote,
  updateNote,
  deleteNote,
};
