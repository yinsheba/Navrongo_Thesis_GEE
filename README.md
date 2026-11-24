# Navrongo_Thesis_GEE

Google Earth Engine scripts from my BSc thesis, *Urban Green Cover Change and Its Thermal Implications in Navrongo, Ghana: A Multi-Temporal Remote Sensing Analysis (2015-2025)*, University of Technology and Applied Sciences (UTAS), Navrongo, Ghana, 2026.

**Author:** Elisheba Yinbemi Yin | yinsheba@gmail.com

## What is in this repository

| Script | What it does |
|---|---|
| `Multi-Classifier Comparison - Navrongo 2025` | Compares SVM, CART and Gradient Tree Boost classifiers on the same Sentinel-2 inputs for Navrongo, 2025 |
| `RF Classification No NDWI` | Random Forest land cover classification <!-- CONFIRM: which configuration this script holds --> |
| `RF Classification - Navrongo 2025` | Random Forest with the full 16-feature stack <!-- CONFIRM --> |
| `Bagre flood risk mapping` | Separate project: Sentinel-1 SAR flood extent downstream of the Bagre Dam |

## How to open the scripts

You need a free Earth Engine account. Open this link and accept the repository:

https://code.earthengine.google.com/?accept_repo=users/yinelishebayinbemi/Navrongo_Thesis_GEE

The classification scripts read two assets, which are shared publicly:

- `users/yinelishebayinbemi/Navrongo_Study_Area_UTM` (study area boundary)
- `users/yinelishebayinbemi/Training_Polygons_WGS84` (training polygons)

## Method in brief

- **Imagery:** Sentinel-2 L2A (`COPERNICUS/S2_SR_HARMONIZED`), March 2025, cloud cover below 20%, median composite clipped to the 15 km2 study area.
- **Inputs (16 features):** six Sentinel-2 bands, five spectral indices (NDVI, NDBI, BSI, NDMI, EVI) and five auxiliary layers (SRTM elevation, slope, distance to roads from OpenStreetMap, distance to water from JRC Global Surface Water, GHSL built-up).
- **Training data:** 44 digitised polygons covering four classes (Urban, Vegetation, Bare Land, Water Body), giving 654 training pixels at 10 m.
- **Validation:** 63 field ground control points collected with SW Maps using GNSS averaging (50 in April 2026 and 13 in June 2026), assessed with a confusion matrix, Overall Accuracy and Kappa.

## Classifier comparison

Same training and validation data for every classifier.

| Classifier | Overall Accuracy (%) | Kappa |
|---|---|---|
| Maximum Likelihood | 50 | 0.267 |
| Random Forest (standard, 6 bands) | 62 | 0.423 |
| CART | 52 | 0.304 |
| Gradient Tree Boost | 46 | 0.230 |
| SVM | 52 | 0.350 |
| **Random Forest (full feature set, 150 trees)** | **73** | **0.635** |

## What was not done in Earth Engine

Earth Engine was used for classification. NDVI, land surface temperature, change detection, the NDVI-LST correlation and the vulnerability index were produced in ArcMap 10.4 and Excel from USGS and Copernicus downloads. The full step-by-step workflow, with formulas, is in [`NDVI_LST_workflow.md`](NDVI_LST_workflow.md).

## Limitations

- Imagery is from the dry season (February to March), so desiccated herbaceous vegetation is under-represented.
- The main confusion is between Vegetation and Bare Land: 13 of the 27 vegetation validation points were classified as bare land.
- Validation points were collected 13 to 16 months after image acquisition, so only stable cover types were sampled.
