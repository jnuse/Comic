mod file_system;
mod image_handler;
mod storage;
mod zip_handler;

use file_system::{FileNode, scan_directory, get_images_in_directory};
use image_handler::{ImageChunk, read_image_as_base64, read_image_as_bytes, get_image_dimensions, split_image_to_chunks};
use storage::{
    AppData, AppDataCache, Bookmark, ReadingProgress, Settings,
    load_app_data, save_progress, get_progress,
    add_bookmark, remove_bookmark, get_bookmarks, get_comic_bookmarks,
    save_settings, get_settings, save_last_opened_path, get_last_opened_path,
};
use zip_handler::{ZipCache, ZipImageInfo, get_zip_image_list, read_zip_image, read_zip_image_bytes};
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
fn cmd_read_zip_image(zip_path: String, image_path: String, cache: tauri::State<ZipCache>) -> Result<String, String> {
    read_zip_image(&zip_path, &image_path, &cache)
}

// ============== 图片命令 ==============

/// 读取图片为 Base64
#[tauri::command]
fn cmd_read_image(path: String) -> Result<String, String> {
    read_image_as_base64(&path)
}

/// 读取图片为二进制数据（用于 Blob URL）
#[tauri::command]
fn cmd_read_image_bytes(path: String) -> Result<Vec<u8>, String> {
    read_image_as_bytes(&path)
}

/// 读取 ZIP 中的图片为二进制数据（用于 Blob URL）
#[tauri::command]
fn cmd_read_zip_image_bytes(zip_path: String, image_path: String, cache: tauri::State<ZipCache>) -> Result<Vec<u8>, String> {
    read_zip_image_bytes(&zip_path, &image_path, &cache)
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
fn cmd_save_progress(app: AppHandle, cache: tauri::State<AppDataCache>, progress: ReadingProgress) -> Result<(), String> {
    save_progress(&app, &cache, progress)
}

/// 获取阅读进度
#[tauri::command]
fn cmd_get_progress(app: AppHandle, cache: tauri::State<AppDataCache>, comic_path: String) -> Result<Option<ReadingProgress>, String> {
    get_progress(&app, &cache, &comic_path)
}

/// 添加书签
#[tauri::command]
fn cmd_add_bookmark(app: AppHandle, cache: tauri::State<AppDataCache>, bookmark: Bookmark) -> Result<(), String> {
    add_bookmark(&app, &cache, bookmark)
}

/// 删除书签
#[tauri::command]
fn cmd_remove_bookmark(app: AppHandle, cache: tauri::State<AppDataCache>, bookmark_id: String) -> Result<(), String> {
    remove_bookmark(&app, &cache, &bookmark_id)
}

/// 获取所有书签
#[tauri::command]
fn cmd_get_bookmarks(app: AppHandle, cache: tauri::State<AppDataCache>) -> Result<Vec<Bookmark>, String> {
    get_bookmarks(&app, &cache)
}

/// 获取漫画的书签
#[tauri::command]
fn cmd_get_comic_bookmarks(app: AppHandle, cache: tauri::State<AppDataCache>, comic_path: String) -> Result<Vec<Bookmark>, String> {
    get_comic_bookmarks(&app, &cache, &comic_path)
}

/// 保存设置
#[tauri::command]
fn cmd_save_settings(app: AppHandle, cache: tauri::State<AppDataCache>, settings: Settings) -> Result<(), String> {
    save_settings(&app, &cache, settings)
}

/// 获取设置
#[tauri::command]
fn cmd_get_settings(app: AppHandle, cache: tauri::State<AppDataCache>) -> Result<Settings, String> {
    get_settings(&app, &cache)
}

/// 保存最后打开的路径
#[tauri::command]
fn cmd_save_last_path(app: AppHandle, cache: tauri::State<AppDataCache>, path: String) -> Result<(), String> {
    save_last_opened_path(&app, &cache, &path)
}

/// 获取最后打开的路径
#[tauri::command]
fn cmd_get_last_path(app: AppHandle, cache: tauri::State<AppDataCache>) -> Result<Option<String>, String> {
    get_last_opened_path(&app, &cache)
}

/// 加载所有应用数据
#[tauri::command]
fn cmd_load_app_data(app: AppHandle, cache: tauri::State<AppDataCache>) -> Result<AppData, String> {
    load_app_data(&app, &cache)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ZipCache::default())
        .manage(AppDataCache::default())
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
            cmd_read_zip_image_bytes,
            // 图片
            cmd_read_image,
            cmd_read_image_bytes,
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
