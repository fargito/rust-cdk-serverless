use serde::Serialize;

#[derive(Serialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: String,
}
