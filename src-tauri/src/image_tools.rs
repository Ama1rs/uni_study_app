use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageFormat};
use oxipng::Options;
use std::fs;
use std::path::{Path, PathBuf};

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn detect_format_from_path(path: &Path) -> Option<ImageFormat> {
    match path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "png" => Some(ImageFormat::Png),
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "webp" => Some(ImageFormat::WebP),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        "tif" | "tiff" => Some(ImageFormat::Tiff),
        _ => None,
    }
}

fn resize_contain(img: DynamicImage, width: u32, height: u32) -> DynamicImage {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return img;
    }

    let scale_w = width as f32 / w as f32;
    let scale_h = height as f32 / h as f32;
    let scale = scale_w.min(scale_h);

    let new_w = ((w as f32) * scale).round().max(1.0) as u32;
    let new_h = ((h as f32) * scale).round().max(1.0) as u32;

    img.resize_exact(new_w, new_h, FilterType::Lanczos3)
}

fn resize_cover(img: DynamicImage, width: u32, height: u32) -> DynamicImage {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return img;
    }

    let scale_w = width as f32 / w as f32;
    let scale_h = height as f32 / h as f32;
    let scale = scale_w.max(scale_h);

    let new_w = ((w as f32) * scale).round().max(1.0) as u32;
    let new_h = ((h as f32) * scale).round().max(1.0) as u32;

    let resized = img.resize_exact(new_w, new_h, FilterType::Lanczos3);

    let x = ((new_w as i64 - width as i64) / 2).max(0) as u32;
    let y = ((new_h as i64 - height as i64) / 2).max(0) as u32;

    resized.crop_imm(x, y, width.min(new_w), height.min(new_h))
}

pub fn image_resize(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
    mode: String,
) -> Result<String, String> {
    let in_path = PathBuf::from(&input_path);
    let out_path = PathBuf::from(&output_path);

    ensure_parent_dir(&out_path)?;

    let img = image::open(&in_path).map_err(|e| e.to_string())?;

    let mode = mode.trim().to_lowercase();
    let resized = match mode.as_str() {
        "cover" => resize_cover(img, width, height),
        "stretch" => img.resize_exact(width, height, FilterType::Lanczos3),
        _ => resize_contain(img, width, height),
    };

    let format = detect_format_from_path(&out_path)
        .or_else(|| detect_format_from_path(&in_path))
        .unwrap_or(ImageFormat::Png);

    resized
        .save_with_format(&out_path, format)
        .map_err(|e| e.to_string())?;

    Ok(output_path)
}

pub fn image_convert(input_path: String, output_path: String) -> Result<String, String> {
    let in_path = PathBuf::from(&input_path);
    let out_path = PathBuf::from(&output_path);

    ensure_parent_dir(&out_path)?;

    let img = image::open(&in_path).map_err(|e| e.to_string())?;

    let format = detect_format_from_path(&out_path).ok_or_else(|| {
        "Unsupported output image format. Use png/jpg/jpeg/webp/gif/bmp/tiff.".to_string()
    })?;

    img.save_with_format(&out_path, format)
        .map_err(|e| e.to_string())?;

    Ok(output_path)
}

pub fn image_batch_optimize(
    input_paths: Vec<String>,
    output_dir: String,
    jpeg_quality: Option<u8>,
) -> Result<Vec<String>, String> {
    let out_dir = PathBuf::from(&output_dir);
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let mut outputs = Vec::new();

    for input in input_paths {
        let in_path = PathBuf::from(&input);
        let file_name = in_path
            .file_name()
            .ok_or("Invalid input filename")?
            .to_string_lossy()
            .to_string();

        let out_path = out_dir.join(file_name);

        let ext = in_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        if ext == "png" {
            let data = fs::read(&in_path).map_err(|e| e.to_string())?;
            let opts = Options::from_preset(6);
            let optimized = oxipng::optimize_from_memory(&data, &opts).map_err(|e| e.to_string())?;
            fs::write(&out_path, optimized).map_err(|e| e.to_string())?;
        } else if ext == "jpg" || ext == "jpeg" {
            let img = image::open(&in_path).map_err(|e| e.to_string())?;
            let quality = jpeg_quality.unwrap_or(85).clamp(1, 100);
            let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            let rgb = img.to_rgb8();
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out_file, quality);
            encoder
                .encode(
                    rgb.as_raw(),
                    rgb.width(),
                    rgb.height(),
                    image::ColorType::Rgb8.into(),
                )
                .map_err(|e| e.to_string())?;
        } else {
            let img = image::open(&in_path).map_err(|e| e.to_string())?;
            let format = detect_format_from_path(&in_path).unwrap_or(ImageFormat::Png);
            img.save_with_format(&out_path, format)
                .map_err(|e| e.to_string())?;
        }

        outputs.push(out_path.to_string_lossy().to_string());
    }

    Ok(outputs)
}
