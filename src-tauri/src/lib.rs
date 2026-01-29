mod file_system;
mod image_handler;
mod storage;
mod zip_handler;

use file_system::{FileNode, scan_directory, get_images_in_directory};
use image_handler::{ImageChunk, read_image_as_base64, get_image_dimensions, split_image_to_chunks};
use storage::{
    AppData, Bookmark, ReadingProgress, Settings,
    load_app_data, save_progress, get_progress,
    add_bookmark, remove_bookmark, get_bookmarks, get_comic_bookmarks,
    save_settings, get_settings, save_last_opened_path, get_last_opened_path,
};
use zip_handler::{ZipImageInfo, get_zip_image_list, read_zip_image};
use tauri::AppHandle;

// ============== 文件系统命令 ==============

/// 扫描目录
#[tauri::command]
fn cmd_scan_directory(path: String, max_depth: u32) -> Result<FileNode, String> {
    scan_directory(&path, 0, max_depth)
}

/// 获取目录中的图片列表
#[tauri::command]
fn cmd_get_directory_images(path: String) -> Result<Vec<String>, String> {
    get_images_in_directory(&path)
}

// ============== ZIP 命令 ==============

/// 获取 ZIP 中的图片列表
#[tauri::command]
fn cmd_get_zip_images(path: String) -> Result<Vec<ZipImageInfo>, String> {
    get_zip_image_list(&path)
}

/// 读取 ZIP 中的图片
#[tauri::command]
fn cmd_read_zip_image(zip_path: String, image_path: String) -> Result<String, String> {
    read_zip_image(&zip_path, &image_path)
}

// ============== 图片命令 ==============

/// 读取图片为 Base64
#[tauri::command]
fn cmd_read_image(path: String) -> Result<String, String> {
    read_image_as_base64(&path)
}

/// 获取图片尺寸
#[tauri::command]
fn cmd_get_image_dimensions(path: String) -> Result<(u32, u32), String> {
    get_image_dimensions(&path)
}

/// 分块读取图片
#[tauri::command]
fn cmd_split_image(path: String, chunk_height: u32) -> Result<Vec<ImageChunk>, String> {
    split_image_to_chunks(&path, chunk_height)
}

// ============== 存储命令 ==============

/// 保存阅读进度
#[tauri::command]
fn cmd_save_progress(app: AppHandle, progress: ReadingProgress) -> Result<(), String> {
    save_progress(&app, progress)
}

/// 获取阅读进度
#[tauri::command]
fn cmd_get_progress(app: AppHandle, comic_path: String) -> Result<Option<ReadingProgress>, String> {
    get_progress(&app, &comic_path)
}

/// 添加书签
#[tauri::command]
fn cmd_add_bookmark(app: AppHandle, bookmark: Bookmark) -> Result<(), String> {
    add_bookmark(&app, bookmark)
}

/// 删除书签
#[tauri::command]
fn cmd_remove_bookmark(app: AppHandle, bookmark_id: String) -> Result<(), String> {
    remove_bookmark(&app, &bookmark_id)
}

/// 获取所有书签
#[tauri::command]
fn cmd_get_bookmarks(app: AppHandle) -> Result<Vec<Bookmark>, String> {
    get_bookmarks(&app)
}

/// 获取漫画的书签
#[tauri::command]
fn cmd_get_comic_bookmarks(app: AppHandle, comic_path: String) -> Result<Vec<Bookmark>, String> {
    get_comic_bookmarks(&app, &comic_path)
}

/// 保存设置
#[tauri::command]
fn cmd_save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    save_settings(&app, settings)
}

/// 获取设置
#[tauri::command]
fn cmd_get_settings(app: AppHandle) -> Result<Settings, String> {
    get_settings(&app)
}

/// 保存最后打开的路径
#[tauri::command]
fn cmd_save_last_path(app: AppHandle, path: String) -> Result<(), String> {
    save_last_opened_path(&app, &path)
}

/// 获取最后打开的路径
#[tauri::command]
fn cmd_get_last_path(app: AppHandle) -> Result<Option<String>, String> {
    get_last_opened_path(&app)
}

/// 加载所有应用数据
#[tauri::command]
fn cmd_load_app_data(app: AppHandle) -> Result<AppData, String> {
    load_app_data(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // 文件系统
            cmd_scan_directory,
            cmd_get_directory_images,
            // ZIP
            cmd_get_zip_images,
            cmd_read_zip_image,
            // 图片
            cmd_read_image,
            cmd_get_image_dimensions,
            cmd_split_image,
            // 存储
            cmd_save_progress,
            cmd_get_progress,
            cmd_add_bookmark,
            cmd_remove_bookmark,
            cmd_get_bookmarks,
            cmd_get_comic_bookmarks,
            cmd_save_settings,
            cmd_get_settings,
            cmd_save_last_path,
            cmd_get_last_path,
            cmd_load_app_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
