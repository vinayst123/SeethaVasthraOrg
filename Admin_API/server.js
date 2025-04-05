const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const app = express();

// Database connection
mongoose.connect('mongodb+srv://vinayst:5OLN0a7MMM0MH3zN@bluestock.8icni.mongodb.net/?retryWrites=true&w=majority&appName=Bluestock');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static('public'));

// EJS configuration
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session configuration
app.use(session({
  secret: 'securepassword',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Passport and flash configuration
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  next();
});

// Schemas and models
const apiSchema = new mongoose.Schema({
  name: String,
  endpoint: String,
  method: String,
  responseStatus: { type: Number, default: 200 },
  responseType: String,
  responseFile: String,
  templateFile: String,
  templateContent: String,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const ipoSchema = new mongoose.Schema({
  companyName: String,
  logo: { type: String, default: '/placeholder-logo.png' },
  priceBand: String,
  open: Date,
  close: Date,
  issueSize: String,
  issueType: String,
  listingDate: Date,
  status: String,
  ipoPrice: String,
  listingPrice: String,
  listingGain: String,
  listedDate: Date,
  cmp: String,
  currentReturn: String,
  rhp: String,
  drhp: String
});

const User = mongoose.model('User', userSchema);
const Api = mongoose.model('Api', apiSchema);
const IPO = mongoose.model('IPO', ipoSchema);

// Passport configuration
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    if (!bcrypt.compareSync(password, user.password))
      return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Create initial admin user if not exists
async function createInitialAdmin() {
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 12);
    const admin = new User({ username: 'admin', password: hashedPassword });
    await admin.save();
    console.log('Initial admin created');
  }
}
createInitialAdmin();

// Public API Handling Middleware
app.use(async (req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/management')) return next();
  try {
    const api = await Api.findOne({
      endpoint: req.path,
      method: req.method,
      active: true,
    });
    if (!api) return next();
    if (api.responseType === 'template') {
      const templatePath = path.join(__dirname, 'templates', api.templateFile);
      if (!fs.existsSync(templatePath)) {
        console.error(`Template file not found: ${templatePath}`);
        return res.status(500).send('Template file not found');
      }
      const content = ejs.render(fs.readFileSync(templatePath, 'utf8'), {
        query: req.query,
        body: req.body,
        params: req.params,
      });
      res.type('html').status(api.responseStatus).send(content);
    } else {
      const filePath = path.join(__dirname, 'responses', api.responseFile);
      if (!fs.existsSync(filePath)) {
        console.error(`Response file not found: ${filePath}`);
        return res.status(500).send('Response file not found');
      }
      const content = fs.readFileSync(filePath, 'utf8');
      res.type(api.responseType).status(api.responseStatus).send(content);
    }
  } catch (error) {
    console.error('API Handling Error:', error);
    res.status(500).send('Error processing request');
  }
});

// Date formatting helper
function formatDate(dateString) {
  if (!dateString || dateString === "Not Issued") return "Not Issued";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Not Issued" : date.toLocaleDateString('en-GB').replace(/\//g, '-');
}

// Routes

// Listings route
app.get('/listings', async (req, res) => {
  try {
    const ipoList = await IPO.find({});
    const formattedIPOs = ipoList.map(ipo => ({
      ...ipo.toObject(),
      open: formatDate(ipo.open),
      close: formatDate(ipo.close),
      listingDate: formatDate(ipo.listingDate),
      listedDate: formatDate(ipo.listedDate),
    }));
    res.render('listings/ipo_listing.ejs', { ipoList: formattedIPOs, error: req.flash('error') });
  } catch (error) {
    console.error('Error fetching IPOs:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Community route
app.get('/community', (req, res) => {
  res.render('listings/community.ejs', { error: req.flash('error') });
});


app.get('/support', (req, res) => {
  res.render('listings/support.ejs', { error: req.flash('error') });
});

app.get('/login', (req, res) => {
  res.render('listings/login.ejs', { error: req.flash('error') });
});

app.get('/signup', (req, res) => {
  res.render('listings/signup.ejs', { error: req.flash('error') });
});

// Fixed IPO submission route
app.post('/admin/ipo/new', async (req, res) => {
  try {
    console.log('Received IPO data:', req.body);
    const parseDate = dateStr => dateStr ? new Date(dateStr) : undefined;
    const newIPO = new IPO({
      companyName: req.body.companyName,
      logo: req.body.logo || '/placeholder-logo.png',
      priceBand: req.body.priceBand,
      open: parseDate(req.body.open),
      close: parseDate(req.body.close),
      issueSize: req.body.issueSize,
      issueType: req.body.issueType,
      listingDate: parseDate(req.body.listingDate),
      status: req.body.status,
      ipoPrice: req.body.ipoPrice,
      listingPrice: req.body.listingPrice,
      listingGain: req.body.listingGain,
      listedDate: parseDate(req.body.listedDate),
      cmp: req.body.cmp,
      currentReturn: req.body.currentReturn,
      rhp: req.body.rhp,
      drhp: req.body.drhp
    });
    await newIPO.save();
    console.log('IPO saved successfully:', newIPO);
    res.redirect('/listings');
  } catch (error) {
    console.error('IPO Save Error:', error.message);
    console.error('Validation Errors:', error.errors);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Please login first');
  res.redirect('/admin/login');
};

// Route to handle upcoming IPOs with standard pagination
app.get('/admin/upcoming-ipo', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const totalIpos = await IPO.countDocuments();
    const totalPages = Math.ceil(totalIpos / limit);
    const ipos = await IPO.find()
      .sort({ listingDate: -1 })
      .skip(skip)
      .limit(limit);

    // Helper for IPO status badge color
    const getStatusColor = status => {
      switch (status.toLowerCase()) {
        case 'ongoing': return 'success';
        case 'coming': return 'warning';
        case 'new listed': return 'danger';
        default: return 'secondary';
      }
    };

    res.render('listings/upcoming-ipo', {
      ipos,
      currentPage: page,
      totalPages,
      totalIpos,
      user: req.user,
      formatDate,
      getStatusColor
    });
  } catch (error) {
    console.error('Error fetching IPOs:', error);
    res.status(500).send('Internal Server Error');
  }
});

// API endpoint for paginated IPO data (used for AJAX pagination)
app.get('/api/ipos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const ipos = await IPO.find()
      .sort({ listingDate: -1 })
      .skip(skip)
      .limit(limit);
    const total = await IPO.countDocuments();
    res.json({
      ipos,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for paginated IPO Subscription data
app.get('/api/ipoSubscriptions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const subscriptions = await IPO.find()
      .sort({ listingDate: -1 })
      .skip(skip)
      .limit(limit);
    const total = await IPO.countDocuments();
    res.json({
      subscriptions,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single IPO
app.get('/api/ipos/:id', async (req, res) => {
  try {
    const ipo = await IPO.findById(req.params.id);
    if (!ipo) {
      return res.status(404).json({ error: 'IPO not found' });
    }
    res.json(ipo);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update IPO
app.put('/api/ipos/:id', ensureAuthenticated, async (req, res) => {
  try {
    const ipo = await IPO.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ipo) {
      return res.status(404).json({ error: 'IPO not found' });
    }
    res.json(ipo);
  } catch (error) {
    console.error('Error updating IPO:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete IPO
app.delete('/api/ipos/:id', ensureAuthenticated, async (req, res) => {
  try {
    const ipo = await IPO.findByIdAndDelete(req.params.id);
    if (!ipo) {
      return res.status(404).json({ error: 'IPO not found' });
    }
    res.json({ message: 'IPO deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication routes
app.get('/admin/login', (req, res) => {
  res.render('listings/admin_login.ejs', { error: req.flash('error') });
});

app.post('/admin/login', passport.authenticate('local', {
  successRedirect: '/admin/dashboard',
  failureRedirect: '/admin/login',
  failureFlash: true
}));

app.get('/admin/logout', (req, res) => {
  req.logout();
  res.redirect('/admin/login');
});

// Protected admin dashboard route
app.get('/admin/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Compute dashboardData from your database
    const totalIPO = await IPO.countDocuments();
    const ipoOngoing = await IPO.countDocuments({ status: { $regex: /ongoing/i } });
    const ipoNewListed = await IPO.countDocuments({ status: { $regex: /new listed/i } });
    const ipoComing = await IPO.countDocuments({ status: { $regex: /coming/i } });
    
    // For example, use ongoing as "gain" and the remainder as "loss"
    const ipoGain = ipoOngoing;
    const ipoLoss = totalIPO - ipoGain;
    
    // Get the earliest listingDate as boardStartDate (if available)
    let boardStartDate = "N/A";
    const earliestIPO = await IPO.findOne().sort({ listingDate: 1 }).exec();
    if (earliestIPO && earliestIPO.listingDate) {
      boardStartDate = earliestIPO.listingDate.toLocaleDateString('en-GB');
    }
    
  
    // Build dashboardData
    const dashboardData = {
      description: "Adipiscing elit, sed do eiusmod tempor", // Replace or compute dynamically
      totalIPO,
      ipoGain,
      ipoLoss,
      boardStartDate,
      quickLinks: [
        { shortName: "NSE", name: "NSE India", bgColor: "#fee2e2", url: "https://www.nseindia.com" },
        { shortName: "BSE", name: "BSE India", bgColor: "#e0e7ff", url: "https://www.bseindia.com" },
        { shortName: "SEBI", name: "SEBI", bgColor: "#dcfce7", url: "https://www.sebi.gov.in" },
        { shortName: "MC", name: "Money Control", bgColor: "#f3e8ff", url: "https://www.moneycontrol.com" }
      ],
      chartLabels: ["Upcoming", "New Listed", "Ongoing"],
      
      chartData: [ipoComing, ipoNewListed, ipoOngoing],
      chartColors: ["#8495ec", "#586acb", "#c7ccff"],
      chartLegend: [
        { label: "Upcoming", count: ipoComing, color: "#8495ec" },
        { label: "New Listed", count: ipoNewListed, color: "#586acb" },
        { label: "Ongoing", count: ipoOngoing, color: "#c7ccff" }
      ]
    };

    // Also load any additional data you need (e.g., ipos for other sections)
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const ipos = await IPO.find()
      .sort({ listingDate: -1 })
      .skip(skip)
      .limit(limit);
    const totalIpos = await IPO.countDocuments();
    const totalPages = Math.ceil(totalIpos / limit);
    
    // Pass dashboardData along with other variables to nav.ejs
    res.render('listings/nav.ejs', { 
      user: req.user,
      dashboardData,
      ipos,
      currentPage: page,
      totalPages,
      formatDate,
      getStatusColor: status => {
        switch (status.toLowerCase()) {
          case 'ongoing': return 'success';
          case 'coming': return 'warning';
          case 'new listed': return 'danger';
          default: return 'secondary';
        }
      }
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Protected management endpoints for API management
app.get('/management/apis', ensureAuthenticated, async (req, res) => {
  try {
    const apis = await Api.find();
    res.json(apis);
  } catch (error) {
    console.error('Error fetching APIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/management/apis', ensureAuthenticated, async (req, res) => {
  try {
    const newApi = new Api(req.body);
    await newApi.save();
    res.json(newApi);
  } catch (error) {
    console.error('Error creating API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/management/apis/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Attempting to update API with ID:', id);
    const updatedApi = await Api.findByIdAndUpdate(id, { ...req.body, updatedAt: Date.now() }, { new: true });
    if (!updatedApi) {
      return res.status(404).json({ error: 'API not found' });
    }
    res.json(updatedApi);
  } catch (error) {
    console.error('Error updating API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/management/apis/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedApi = await Api.findByIdAndDelete(id);
    if (!deletedApi) {
      return res.status(404).json({ error: 'API not found' });
    }
    res.json({ message: 'API deleted successfully' });
  } catch (error) {
    console.error('Error deleting API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
