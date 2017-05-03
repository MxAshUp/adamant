module.exports = express => {
  express.get('/debug', (req, res) => {
    res.send('Debug time!');
  });
};
