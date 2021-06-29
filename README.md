# VTradeIN
VTradeIN is simple stock market simulator created using NodeJS, ExpressJS, MongoDB and EJS.

## Table of Content
* [General Info](#general-info)
* [Technologies Used](#technologies-used)
* [Local Installation](#local-installation)

## General Info
VTradeIN is simple stock market simulator which gives real time experience of stock market to the user. When the user creates an account he/she gets 1,00,00,000 tokens in their account which can be used to buy and sell various stocks listed on NSE and BSE.<br>

## Technologies Used
Tech Stack which has been used are as follows:<br>
* NodeJS Express Framework - This helped in defining the routes of the website and render the HTML pages.<br>
* PassportJS - This helped in user authentication and authorization and safety of user's data which was entered during registeration.<br>
* EJS - Embedded Javascript is a templating language which helped in generating HTML pages.<br>
* Bootstrap v5.0.5 - This helped in creating the front-end and adding styles to our website.

## Local Installation
* Download the zip file of the code and extract the files.
* Open the terminal and install the dependencies by entering *npm install* into the terminal.
```shell
npm install
```
* Create a .env file in the root directory.
* Set up the required environment variables in the .env file: 
```javascript
DB_URL= // mongodb://localhost:27017/blogify
SECRET= // "ANYTHINGCANBEHERE"
```
* Run the project by entering *npm start*.
```shell
npm start
```
* Now open the browser and search for *localhost:3000/*.<br>
