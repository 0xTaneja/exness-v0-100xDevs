pub mod db;
pub mod models;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct BookTicker {
    #[serde(rename = "B")]
    pub bidquantity : String,
    #[serde(rename = "A")]
    pub askquantity: String,
    #[serde(rename ="b")]
    pub bestbid: String, 
    #[serde(rename = "a")]
    pub bestask: String,
    #[serde(rename = "s")]
    pub ticker: String,
    #[serde(rename = "e")]
    pub tickertype: String,
}
#[derive(Debug, Deserialize)]
pub struct BookTickerMessage {
    pub data :BookTicker,
    pub stream : String
}
