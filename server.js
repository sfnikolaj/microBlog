const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const { createCanvas } = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Tweeter';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement


app.get('/post/:id', (req, res) => {
    // TODO: Render post detail page
});
app.post('/posts', (req, res) => {
    // TODO: Add a new post and redirect to home
    const title = req.body.title;
    const content = req.body.content;
    const user = getCurrentUser(req);
    if (user) {
        addPost(title, content, user);
    }
    res.redirect('/');
});

app.post('/like/:id', isAuthenticated, (req, res) => {
    // TODO: Update post likes
    const postId = parseInt(req.params.id);
    const userId = req.user ? req.user.id : null;

    console.log('Post ID:', postId);
    console.log('User ID:', userId);

    if (!userId) {
        return res.status(400).send('User not authenticated.');
    }

    // Initialize user's likes array if it doesn't exist
    if (!userLikes[userId]) {
        userLikes[userId] = [];
    }

    // Check if the user has already liked the post
    if (userLikes[userId].includes(postId)) {
        return res.status(400).send('You have already liked this post.');
    }

    // Find the post and increment likes
    const post = posts.find(post => post.id === postId);
    if (post) {
        post.likes++;
        userLikes[userId].push(postId); // Record that the user liked this post
        res.send({ likes: post.likes });
    } else {
        res.sendStatus(404);
    }
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id);
    const userId = req.user ? req.user.id : null;

    if (!userId) {
        return res.status(400).send('User not authenticated.');
    }

    const postIndex = posts.findIndex(post => post.id === postId && post.username === findUserById(userId).username);

    if (postIndex > -1) {
        posts.splice(postIndex, 1);
        res.json({ success: true });
    } else {
        console.error(`Failed to delete post: Post not found or user not authorized. Post ID: ${postId}, User ID: ${userId}`);
        res.json({ success: false, message: 'You can only delete your own posts.' });
    }
});

app.get('/profile', isAuthenticated, (req, res) => {
    // TODO: Render profile page
    renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    const username = req.params.username;
    const user = findUserByUsername(username);

    if (user) {
        const letter = username.charAt(0).toUpperCase();
        const avatar = generateAvatar(letter);
        res.set('Content-Type', 'image/png');
        res.send(avatar);
    } else {
        res.sendStatus(404);
    }
});
app.post('/register', (req, res) => {
    // TODO: Register a new user
    registerUser(req, res);
});
app.post('/login', (req, res) => {
    // TODO: Login a user
    console.log("Hey");
    loginUser(req, res);
    // Old code to redirect to home page if user is logged in replaced with actual login function
    // if(getCurrentUser(req)){
    //     res.redirect('/');
    // }
    // else{
    // console.log("User not found");
    // }
});
app.get('/logout', (req, res) => {
    // TODO: Logout the user
    logoutUser(req, res);
});




// Based on picture you took on wednesday lecture
// you can create a register like this
app.post('/register', registerUser);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
let posts = [
    { id: 1, title: 'Sample Post', content: 'This is a sample post.', username: 'SampleUser', timestamp: '2024-01-01 10:00', likes: 0 },
    { id: 2, title: 'Another Post', content: 'This is another sample post.', username: 'AnotherUser', timestamp: '2024-01-02 12:00', likes: 0 },
];
let users = [
    { id: 1, username: 'SampleUser', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'AnotherUser', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];

// Function to find a user by username
function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    for (let user of users) {
        if (user.username === username) {
            return user;
        }
    }
    return undefined;
}

// Function to find a user by user ID
function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    for (let user of users) {
        if (user.id === userId) {
            return user;
        }
    }
    return undefined;
}

// Function to add a new user
function addUser(username) {
    // TODO: Create a new user object and add to users array
    let user = {
        id: users.length + 1,
        username: username,
        avatar_url: undefined,
        memberSince: "2024",
    };
    users.push(user);
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
// Function provided by Prof. Posnett in the lecture
function registerUser(req, res) {
    const username = req.body.username;
    console.log("Attempting to register:", username);
    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username+already+exists');
    } else {
        addUser(username);
        res.redirect('/login');
    }
}

// Function to login a user
function loginUser(req, res) {
    // TODO: Login a user and redirect appropriately
    const username = req.body.username;
    const user = findUserByUsername(username);
    if (user) {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        console.log("User logged in. UserID:", user.id); 
        res.redirect('/');
    } else {
        res.redirect('/login?error=Invalid+username');
    }
}


// Function to logout a user
function logoutUser(req, res) {
    // TODO: Destroy session and redirect 
    // Check for failure to destroy session and redirect to error page
    req.session.destroy(err => {
        if (err) {
            res.redirect('/error');
        }
        else {
            res.redirect('/');
        }
    });
    //res.redirect('/');
}

// Function to render the profile page
function renderProfile(req, res) {
    // TODO: Fetch user posts and render the profile page
    const user = getCurrentUser(req);
    const userPosts = posts.filter(post => post.username === user.username);

    // Render the profile template with user data and userPosts
    res.render('profile', {
        user: {
            ...user,
            posts: userPosts,
        },
        postNeoType: 'Post', // or whatever neologism you choose
    });
}

const userLikes = {};
// Function to update post likes
function updatePostLikes(req, res) {
    // TODO: Increment post likes if conditions are met
    return
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // TODO: Generate and serve the user's avatar image
    const username = req.params.username;
    const user = findUserByUsername(username);
    if (user) {
        const letter = username.charAt(0).toUpperCase();
        const avatar = generateAvatar(letter);
        res.set('Content-Type', 'image/png');
        res.send(avatar);
    } else {
        res.sendStatus(404);
    }
}

// Function to get the current user from session
function getCurrentUser(req) {
    const userId = req.session.userId;
    if (userId) {
        for (let user of users) {
            if (user.id === userId) {
                return user;
            }
        }
    }
    return null; // Return null if user is not found or not authenticated
 }
 

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    // TODO: Create a new post object and add to posts array
    const post = {
        id: posts.length + 1,
        title: title,
        content: content,
        username: user.username,
        timestamp: new Date().toISOString(),
        likes: 0,
    };
    posts.push(post);
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Choose a background color
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#33FFF3'];
    const backgroundColor = colors[letter.charCodeAt(0) % colors.length];

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw letter
    ctx.font = `${width * 0.6}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, width / 2, height / 2);

    return canvas.toBuffer();
}