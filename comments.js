// Create A Web Server For Comments

const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');
const app = express();
// Parse request body
app.use(bodyParser.json());
// Enable cors
app.use(cors());
// Store comments
const commentsByPostId = {};
// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
	res.send(commentsByPostId[req.params.id] || []);
});
// Create comment
app.post('/posts/:id/comments', async (req, res) => {
	const commentId = randomBytes(4).toString('hex');
	const { content } = req.body;
	const comments = commentsByPostId[req.params.id] || [];
	comments.push({ id: commentId, content, status: 'pending' });
	commentsByPostId[req.params.id] = comments;
	// Send event to event bus
	await axios.post('http://localhost:4005/events', {
		type: 'CommentCreated',
		data: {
			id: commentId,
			content,
			postId: req.params.id,
			status: 'pending',
		},
	});
	res.status(201).send(comments);
});
// Receive events
app.post('/events', async (req, res) => {
	console.log('Event Received:', req.body.type);
	const { type, data } = req.body;
	// Check if event type is comment moderated
	if (type === 'CommentModerated') {
		const { postId, id, status, content } = data;
		// Update comments
		const comments = commentsByPostId[postId];
		const comment = comments.find((comment) => comment.id === id);
		comment.status = status;
		// Send event to event bus
		await axios.post('http://localhost:4005/events', {
			type: 'CommentUpdated',
			data: { id, status, postId, content },
		});
	}
	res.send({});
});
// Listen on port
app.listen(4001, () => {
	console.log('Listening on 4001');
});