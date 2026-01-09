use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub url: String,
    pub thumbnail: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistData {
    pub title: String,
    pub videos: Vec<VideoInfo>,
}

pub async fn fetch_playlist_data(playlist_url: &str) -> Result<PlaylistData, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(playlist_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let html = response.text().await.map_err(|e| e.to_string())?;

    // Find ytInitialData
    let start_str = "var ytInitialData = ";
    let end_str = ";</script>";

    let start_pos = html
        .find(start_str)
        .ok_or("Could not find ytInitialData in page")?
        + start_str.len();
    let remaining = &html[start_pos..];
    let end_pos = remaining
        .find(end_str)
        .ok_or("Could not find end of ytInitialData")?;

    let json_str = &remaining[..end_pos];
    let data: Value = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse ytInitialData: {}", e))?;

    // Extract Playlist Title
    let title = data["metadata"]["playlistMetadataRenderer"]["title"]
        .as_str()
        .unwrap_or("Imported Playlist")
        .to_string();

    let mut videos = Vec::new();

    // Navigate to the video list
    // Note: The path can vary slightly, but this is the standard one for playlists
    let video_list = &data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"][0]["tabRenderer"]
        ["content"]["sectionListRenderer"]["contents"][0]["itemSectionRenderer"]["contents"][0]
        ["playlistVideoListRenderer"]["contents"];

    if let Some(items) = video_list.as_array() {
        for item in items {
            if let Some(video) = item.get("playlistVideoRenderer") {
                if let (Some(id), Some(title_val)) = (
                    video["videoId"].as_str(),
                    video["title"]["runs"][0]["text"].as_str(),
                ) {
                    let thumbnail = format!("https://img.youtube.com/vi/{}/mqdefault.jpg", id);
                    let url = format!("https://www.youtube.com/watch?v={}", id);

                    videos.push(VideoInfo {
                        id: id.to_string(),
                        title: title_val.to_string(),
                        url,
                        thumbnail,
                    });
                }
            }
        }
    }

    if videos.is_empty() {
        return Err("No videos found in playlist. Is it empty or private?".to_string());
    }

    Ok(PlaylistData { title, videos })
}
