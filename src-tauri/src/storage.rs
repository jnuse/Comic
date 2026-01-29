use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// 阅读进度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingProgress {
    #[serde(rename = "comicPath")]
    pub comic_path: String,
    #[serde(rename = "lastImageIndex")]
    pub last_image_index: usize,
    #[serde(rename = "scrollPosition")]
    pub scroll_position: f64,
    #[serde(rename = "lastReadTime")]
    pub last_read_time: u64,
    #[serde(rename = "zoomMode", default = "default_zoom_mode")]
    pub zoom_mode: Option<String>,
    #[serde(rename = "customZoom", default)]
    pub custom_zoom: Option<f64>,
}

fn default_zoom_mode() -> Option<String> {
    None
}

/// 书签
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: String,
    #[serde(rename = "comicPath")]
    pub comic_path: String,
    #[serde(rename = "comicName")]
    pub comic_name: String,
    #[serde(rename = "imageIndex")]
    pub image_index: usize,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    pub note: Option<String>,
}

/// 设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String, // "light" | "dark" | "system"
    #[serde(rename = "zoomMode")]
    pub zoom_mode: String, // "fit-width" | "fit-height" | "original" | "custom"
    #[serde(rename = "customZoom")]
    pub custom_zoom: f64,
    #[serde(rename = "preloadCount")]
    pub preload_count: u32,
    #[serde(rename = "readerMode", default = "default_reader_mode")]
    pub reader_mode: String, // "embedded" | "fullscreen"
    #[serde(rename = "aspectRatio", default = "default_aspect_ratio")]
    pub aspect_ratio: String, // "auto" | "3:4" | "9:16" | "1:1" | "4:3" | "16:9" | "custom"
    #[serde(rename = "customAspectWidth", default = "default_aspect_width")]
    pub custom_aspect_width: u32,
    #[serde(rename = "customAspectHeight", default = "default_aspect_height")]
    pub custom_aspect_height: u32,
}

fn default_reader_mode() -> String {
    "embedded".to_string()
}

fn default_aspect_ratio() -> String {
    "auto".to_string()
}

fn default_aspect_width() -> u32 {
    3
}

fn default_aspect_height() -> u32 {
    4
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            zoom_mode: "fit-width".to_string(),
            custom_zoom: 100.0,
            preload_count: 3,
            reader_mode: "embedded".to_string(),
            aspect_ratio: "auto".to_string(),
            custom_aspect_width: 3,
            custom_aspect_height: 4,
        }
    }
}

/// 应用数据
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppData {
    pub settings: Settings,
    pub progress: HashMap<String, ReadingProgress>,
    pub bookmarks: Vec<Bookmark>,
    #[serde(rename = "lastOpenedPath")]
    pub last_opened_path: Option<String>,
}

/// 获取数据目录
fn get_data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("无法获取应用数据目录")
}

/// 获取数据文件路径
fn get_data_file_path(app: &AppHandle) -> PathBuf {
    get_data_dir(app).join("comic_data.json")
}

/// 确保数据目录存在
fn ensure_data_dir(app: &AppHandle) -> Result<(), String> {
    let dir = get_data_dir(app);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建数据目录: {}", e))?;
    }
    Ok(())
}

/// 加载应用数据
pub fn load_app_data(app: &AppHandle) -> Result<AppData, String> {
    let file_path = get_data_file_path(app);
    
    if !file_path.exists() {
        return Ok(AppData::default());
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("无法读取数据文件: {}", e))?;
    
    serde_json::from_str(&content).map_err(|e| format!("无法解析数据: {}", e))
}

/// 保存应用数据
pub fn save_app_data(app: &AppHandle, data: &AppData) -> Result<(), String> {
    ensure_data_dir(app)?;
    
    let file_path = get_data_file_path(app);
    let content = serde_json::to_string_pretty(data)
        .map_err(|e| format!("无法序列化数据: {}", e))?;
    
    fs::write(&file_path, content).map_err(|e| format!("无法写入数据文件: {}", e))
}

/// 保存阅读进度
pub fn save_progress(app: &AppHandle, progress: ReadingProgress) -> Result<(), String> {
    let mut data = load_app_data(app)?;
    data.progress.insert(progress.comic_path.clone(), progress);
    save_app_data(app, &data)
}

/// 获取阅读进度
pub fn get_progress(app: &AppHandle, comic_path: &str) -> Result<Option<ReadingProgress>, String> {
    let data = load_app_data(app)?;
    Ok(data.progress.get(comic_path).cloned())
}

/// 添加书签
pub fn add_bookmark(app: &AppHandle, bookmark: Bookmark) -> Result<(), String> {
    let mut data = load_app_data(app)?;
    
    // 检查是否已存在相同书签
    let exists = data.bookmarks.iter().any(|b| {
        b.comic_path == bookmark.comic_path && b.image_index == bookmark.image_index
    });
    
    if !exists {
        data.bookmarks.push(bookmark);
        save_app_data(app, &data)?;
    }
    
    Ok(())
}

/// 删除书签
pub fn remove_bookmark(app: &AppHandle, bookmark_id: &str) -> Result<(), String> {
    let mut data = load_app_data(app)?;
    data.bookmarks.retain(|b| b.id != bookmark_id);
    save_app_data(app, &data)
}

/// 获取所有书签
pub fn get_bookmarks(app: &AppHandle) -> Result<Vec<Bookmark>, String> {
    let data = load_app_data(app)?;
    Ok(data.bookmarks)
}

/// 获取漫画的书签
pub fn get_comic_bookmarks(app: &AppHandle, comic_path: &str) -> Result<Vec<Bookmark>, String> {
    let data = load_app_data(app)?;
    Ok(data
        .bookmarks
        .into_iter()
        .filter(|b| b.comic_path == comic_path)
        .collect())
}

/// 保存设置
pub fn save_settings(app: &AppHandle, settings: Settings) -> Result<(), String> {
    let mut data = load_app_data(app)?;
    data.settings = settings;
    save_app_data(app, &data)
}

/// 获取设置
pub fn get_settings(app: &AppHandle) -> Result<Settings, String> {
    let data = load_app_data(app)?;
    Ok(data.settings)
}

/// 保存最后打开的路径
pub fn save_last_opened_path(app: &AppHandle, path: &str) -> Result<(), String> {
    let mut data = load_app_data(app)?;
    data.last_opened_path = Some(path.to_string());
    save_app_data(app, &data)
}

/// 获取最后打开的路径
pub fn get_last_opened_path(app: &AppHandle) -> Result<Option<String>, String> {
    let data = load_app_data(app)?;
    Ok(data.last_opened_path)
}
