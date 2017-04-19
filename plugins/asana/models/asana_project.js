module.exports =
{
  name: 'asana.project',
  primary_key: 'id',
  schema:
  {
    id: Number,
    name: String,
    owner: {
      id: Number,
      name: String
    },
    current_status: {
      color: String,
      text: String,
      author: {
        id: Number,
        name: String
      }
    },
    // //due_date: Date,
    created_at: String,
    modified_at: String,
    archived: Boolean,
    public: Boolean,
    members: [
      {
        id: Number,
        name: String,
        _id: false
      }
    ],
    followers: [
      {
        id: Number,
        name: String,
        _id: false
      }
    ],
    color: String,
    notes: String,
    workspace: {
      id: Number,
      name: String
    },
    team: {
      id: Number,
      name: String
    },
    layout: String
  }
};
