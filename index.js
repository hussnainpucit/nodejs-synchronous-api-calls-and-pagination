const request = require("request");
const fs = require("fs");
const json2csv = require("json2csv").parse;
const _ = require("underscore");
const RateLimiter = require("limiter").RateLimiter;
const flatten = require("flat");
const limiter = new RateLimiter(1, 500);
// const credentials = require("dotenv").config();

let apikey = "someapikey";
let password = "somepassword";
let storeName = "somestorename";

let baseurl = "https://" + apikey + ":" + password + "@" + storeName + ".myshopify.com";
let numOrders = 0;
let ordersList = [];
let countordersList = 0;
var nextLink;
var apiurl;

let getOrders = function (page, callback) {
  console.log(page);
  return new Promise((resolve, reject) => {
    if (page == 1) {
      apiurl = baseurl + "/admin/orders.json?status=any&limit=100";
    }
    console.log(apiurl);

    request(
      {
        url: apiurl,
        json: true,
      },
      function (error, response, body) {
        console.log("Status-> ", response.statusCode);
        if (!error && response.statusCode === 200) {
          console.log("apiurl Success");
          if (response.headers.link && response.headers.link.indexOf(`rel="next"`) > -1) {
            try {
              // Try to parse our the string we need
              nextLink = response.headers.link;
              console.log("next Link ->  ", response.headers.link);
              // If there's a previous link, remove the first part of the string entirely
              if (nextLink.indexOf(`rel="previous"`) > -1) {
                nextLink = nextLink.substr(nextLink.indexOf(",") + 2, nextLink.length);
              }

              // Parse the remaining string for the actual link
              nextLink = nextLink.substr(1, nextLink.indexOf(">") - 1);
              // READY - CALL THE NEXT SET WITH NEXTLINK
              apiurl = nextLink;
            } catch (ex) {
              console.log("ERROR");
              // console.log(response.headers);
            }
          } else {
            return resolve("ALL ORDERS EXPORTED");
            console.log("ALL ORDERS EXPORTED");
            // console.log(response.headers);
          }

          let newList = [];
          for (i = page === 1 ? 0 : 1; i < body.orders.length; i++) {
            newList.push(flatten(body.orders[i]));
          }

          ordersList = ordersList.concat(newList);
          countordersList += ordersList.length;
          // console.log("Orders received: " + countordersList + " / " + numOrders);
          // console.log();

          json2csv(
            {
              data: ordersList,
              fields: [
                "order_number",
                "email",
                "financial_status",
                "processed_at",
                "fulfillment_status:",
                "currency",
                "total_price",
                "browser_ip",
                "gateway",
                "billing_address.first_name",
                "billing_address.last_name",
                "billing_address.address1",
                "billing_address.address2",
                "billing_address.company",
                "billing_address.city",
                "billing_address.zip",
                "billing_address.province",
                "billing_address.province_code",
                "billing_address.country",
                "billing_address.country_code",
                "billing_address.phone",
                "shipping_address.first_name",
                "shipping_address.last_name",
                "shipping_address.address1",
                "shipping_address.address2",
                "shipping_address.company",
                "shipping_address.city",
                "shipping_address.zip",
                "shipping_address.province_code",
                "shipping_address.country_code",
                "shipping_address.phone",
                "line_items.0.name",
                "line_items.0.quantity",
                "line_items.0.price",
                "line_items.0.sku",
                "line_items.1.name",
                "line_items.1.quantity",
                "line_items.1.price",
                "line_items.1.sku",
                "line_items.2.name",
                "line_items.2.quantity",
                "line_items.2.price",
                "line_items.2.sku",
                "line_items.3.name",
                "line_items.3.quantity",
                "line_items.3.price",
                "line_items.3.sku",
                "line_items.4.name",
                "line_items.4.quantity",
                "line_items.4.price",
                "line_items.4.sku",
              ],
            },
            function (err, csv) {
              if (err) console.log(err);
              fs.appendFile(storeName + ".csv", csv, function (err) {
                if (err) throw err;
                ordersList = [];
              });
            }
          );

          return resolve();
        } else resolve();
      }
    );
  });
};

const markLimiter = () => {
  return new Promise((resolve, reject) => {
    limiter.removeTokens(1, function () {
      resolve();
    });
  });
};
request(
  {
    url: baseurl + "/admin/orders/count.json?status=any",
    json: true,
  },
  async function (error, response, body) {
    if (!error && response.statusCode === 200) {
      numOrders = body.count;
    }
    console.log();
    if (numOrders > 700000) {
      numOrders = 700000;
    }
    console.log("Total: " + body.count);
    console.log("Processing: " + numOrders);
    console.log();
    let numPages = numOrders / 100;
    let r = _.range(1, numPages + 1);

    console.log(r);

    for (let index = 0; index < r.length; index++) {
      const element = r[index];
      await markLimiter();
      await getOrders(element);
    }
    console.log("Total Last: " + ordersList.length);
  }
);
