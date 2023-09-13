use std::error::Error;

use ndc_deno::connector;
use ndc_hub::default_main::default_main;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // default_main::<Deno>().await
    default_main::<connector::TypescriptConnector>().await
}
