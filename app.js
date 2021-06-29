// var API = require('indian-stock-exchange');
require('dotenv').config()
const express = require("express");
const app = express();
const methodOverride = require("method-override");
const path = require("path");
const API = require("./index");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const flash = require("connect-flash");
const User = require("./models/user");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const { isLoggedIn } = require("./middleware");
const validator = require("validator");
const MongoDBStore = require("connect-mongo")(session);
// "mongodb://localhost:27017/VTradeIN"
const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/VTradeIN";
mongoose
	.connect(dbUrl, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
	.then(() => {
		console.log("CONNECTED TO DATABASE");
	})
	.catch(() => {
		console.log("CONNECTION FAILED");
	});

var BSEAPI = API.BSE;
var NSEAPI = API.NSE;

const port = process.env.PORT || 3000;
app.listen(port, () => {
	// console.log(process.env.DB_URL);
	console.log(`Server running on port ${port}`);
});

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
	url: dbUrl,
	secret,
	touchAfter: 24 * 60 * 60
});

const sessionConfig = {
	store,
	secret,
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true,
		expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
		maxAge: 1000 * 60 * 60 * 24 * 7,
	},
};

app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.success = req.flash("success");
	res.locals.error = req.flash("error");
	next();
});

app.get("/", catchAsync(async (req, res, next) => {
	NSEAPI.getIndices().then(function (response) {
		const indices = response.data.data;
		NSEAPI.getMarketStatus().then(function (response) {
			const status = response.data.status;
			NSEAPI.getGainers().then(function (response) {
				const gainers = response.data.data;
				NSEAPI.getLosers().then(function (response) {
					const losers = response.data.data;
					res.render("./home", { indices, status, gainers, losers });
				}).catch((error) => {
					req.flash("error", "Page Not available");
					res.redirect("/stocks/search");
				});
			}).catch((error) => {
				req.flash("error", "Page Not available");
				res.redirect("/stocks/search");
			});
		}).catch((error) => {
			req.flash("error", "Page Not available");
			res.redirect("/stocks/search");
		});
	}).catch((error) => {
		req.flash("error", "Page Not available");
		res.redirect("/stocks/search");
	});
}));

app.get("/user/register", (req, res) => {
	res.render("./user/register");
});

app.post("/user/register", catchAsync(async (req, res, next) => {
	try {
		const { email, username, password } = req.body;
		if (validator.isEmail(email)) {
			const user = new User({ email, username });
			let registeredUser = await User.register(user, password);
			registeredUser.balanceAmt = 10000000;
			await registeredUser.save();
			req.login(registeredUser, (err) => {
				if (err) return next(err);
				req.flash("success", "Welcome to VTradeIN!");
				res.redirect("/stocks/search");
			});
		} else {
			req.flash("error", "Invalid Username or E-Mail ID");
			res.redirect("/user/register");
		}
	} catch (e) {
		req.flash("error", e.message);
		res.redirect("/user/register");
	}
}));

app.get("/user/login", (req, res) => {
	res.render("./user/login");
});

app.post("/user/login", passport.authenticate("local", { failureFlash: true, failureRedirect: "/user/login", }), (req, res) => {
	req.flash("success", "Welcome back!");
	const redirectUrl = req.session.returnTo || "/";
	delete req.session.returnTo;
	res.redirect(redirectUrl);
}
);

app.get("/user/logout", (req, res) => {
	req.logout();
	req.flash("success", "Goodbye!");
	res.redirect("/");
});

app.get("/user/portfolio", isLoggedIn, catchAsync(async (req, res, next) => {
	let stockData = new Map();
	for (let stock of res.locals.currentUser.stockBought) {
		const symbol = stock.symbol;
		await NSEAPI.getQuoteInfo(symbol).then(function (response) {
			const data = response.data.data[0];
			const temp = data.lastPrice.replaceAll(",", "");
			stockData.set(symbol, temp);
		}).catch((error) => {
			req.flash("error", "Request Timed Out");
			res.redirect("/stocks/search");
		});
	}
	res.render("./user/portfolio", { stockData });
}));

app.get("/stocks/search", (req, res) => {
	const searchResult = undefined;
	res.render("./stocks/search", { searchResult });
});

app.post("/stocks/search", catchAsync(async (req, res, next) => {
	const symbol = req.body.stock.name;
	await NSEAPI.searchStocks(symbol)
		.then(function (response) {
			const searchResult = response.data;
			res.render("./stocks/search", { searchResult });
		})
		.catch(() => {
			req.flash("error", "No stock found");
			res.redirect("/stocks/search");
		});
}));

app.get("/stocks/:id", (req, res) => {
	const symbol = req.params.id;
	NSEAPI.getQuoteInfo(symbol)
		.then(function (response) {
			const data = response.data.data[0];
			if (data) {
				res.render("./stocks/show", { data });
			} else {
				res.redirect("/stock/search");
			}
		})
		.catch(() => {
			req.flash("error", "Stock not found");
			res.redirect("/stock/search");
		});
});

app.get("/stocks/:id/buy", isLoggedIn, (req, res) => {
	const symbol = req.params.id;
	NSEAPI.getQuoteInfo(symbol)
		.then(function (response) {
			const data = response.data.data[0];
			if (data) {
				res.render("./stocks/buy", { data });
			} else {
				res.redirect("/stocks/search");
			}
		})
		.catch(() => {
			req.flash("error", "Stock not found");
			res.redirect("/stock/search");
		});
});

app.post("/stocks/:id/buy", catchAsync(async (req, res, next) => {
	const { quantity, amount } = req.body.stock;
	if (isNaN(parseInt(quantity))) {
		req.flash("error", "Quantity must be a number");
		res.redirect(`/stocks/${req.params.id}/buy`);
	} else {
		const symbol = req.params.id;
		let totalAmount = parseFloat(quantity) * parseFloat(amount);
		if (res.locals.currentUser.balanceAmt < totalAmount) {
			req.flash("error", "Funds not available!");
			res.redirect(`/stocks/${symbol}/buy`);
		} else {
			NSEAPI.getQuoteInfo(symbol)
				.then(function (response) {
					const data = response.data.data[0];
					if (data) {
						const temp = data.lastPrice.replaceAll(",", "");
						if (parseFloat(amount) >= parseFloat(temp)) {
							let found = false;
							for (let stock of res.locals.currentUser.stockBought) {
								if (stock.symbol === symbol) {
									found = true;
									const newQty = parseFloat(quantity) + parseFloat(stock.qty);
									stock.buyPrice =
										(stock.buyPrice * stock.qty + totalAmount) / newQty;
									stock.qty = newQty;
									res.locals.currentUser.balanceAmt -= totalAmount;
								}
							}
							if (!found) {
								res.locals.currentUser.stockBought.push({
									symbol: symbol,
									qty: quantity,
									buyPrice: amount,
								});
								res.locals.currentUser.balanceAmt -= totalAmount;
							}
							res.locals.currentUser.save();
							req.flash("success", "Stocks bought");
						} else {
							req.flash("error", "Amount too low");
						}
						res.redirect(`/stocks/${symbol}/buy`);
					} else {
						res.redirect("/stocks/search");
					}
				})
				.catch(() => {
					req.flash("error", "Stock not found");
					res.redirect("/stock/search");
				});
		}
	}
})
);

app.get("/stocks/:id/sell", isLoggedIn, (req, res) => {
	const symbol = req.params.id;
	NSEAPI.getQuoteInfo(symbol)
		.then(function (response) {
			const data = response.data.data[0];
			if (data) {
				res.render("./stocks/sell", { data });
			} else {
				res.redirect("/stocks/search");
			}
		})
		.catch(() => {
			req.flash("error", "Stock not found");
			res.redirect("/stock/search");
		});
});

app.post("/stocks/:id/sell", (req, res) => {
	const { quantity, amount } = req.body.stock;
	if (isNaN(parseInt(quantity))) {
		req.flash("error", "Quantity must be a number");
		res.redirect(`/stocks/${req.params.id}/sell`);
	} else {
		const symbol = req.params.id;
		let found = false;
		let index = 0;
		for (let stock of res.locals.currentUser.stockBought) {
			if (stock.symbol === symbol) {
				found = true;
				if (parseFloat(stock.qty) >= parseFloat(quantity)) {
					NSEAPI.getQuoteInfo(symbol)
						.then(function (response) {
							const data = response.data.data[0];
							if (data) {
								const temp = data.lastPrice.replaceAll(",", "");
								if (temp >= amount) {
									const newQty = parseFloat(stock.qty) - parseFloat(quantity);
									stock.qty = newQty;
									res.locals.currentUser.balanceAmt +=
										parseFloat(quantity) * parseFloat(amount);
									if (newQty === 0) {
										res.locals.currentUser.stockBought.splice(index, 1);
									}
									res.locals.currentUser.save();
									req.flash("success", "Stocks Sold");
									res.redirect(`/stocks/${symbol}/sell`);
								} else {
									req.flash("error", "Amount too high");
									res.redirect(`/stocks/${symbol}/sell`);
								}
							} else {
								res.redirect("/stock/search");
							}
						})
						.catch(() => {
							req.flash("error", "Stock not found");
							res.redirect("/stock/search");
						});
				} else {
					req.flash("error", "Stocks not available");
					res.redirect(`/stocks/${symbol}/sell`);
				}
				break;
			}
			index++;
		}
		if (!found) {
			req.flash("error", "Stocks not available");
			res.redirect(`/stocks/${symbol}/sell`);
		}
	}
});

app.all("*", (req, res, next) => {
	req.flash("error", "Page Not Available");
	res.redirect("/");
});

app.use((err, req, res, next) => {
	const { statusCode = 500 } = err;
	if (!err.message) err.message = "Oh No, Something Went Wrong!";
	res.status(statusCode).render("error", { err });
});

// module.exports = app;