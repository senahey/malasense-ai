# MalaSense AI

**An offline, smartphone-based system for automated malaria blood smear analysis.**

MalaSense AI is a dual-model deep learning system that classifies Giemsa-stained
blood smear images as parasitized or uninfected, covering both thin and thick
smears, and runs entirely on-device as an installable, offline Progressive Web
Application (PWA). It is designed for low-resource settings where stable internet,
high computing power, and expensive imaging hardware are not available.

This repository contains the training notebooks, the trained models, the web
application, and the supporting materials needed to reproduce and run the system
described in the accompanying manuscript.

---

## What the system does

1. A captured blood smear field is first screened by a lightweight input-quality
   gate that warns the user when an image does not look like a stained smear.
2. The operator selects the smear type (thin or thick), and the field is routed
   to the matching EfficientNetB2 classification model.
3. The model returns a parasitized / uninfected decision with a confidence score,
   and an occlusion-based attention map can be shown on request.
4. For thick smears, an exploratory YOLOv8-nano detector can localize and count
   individual parasites.
5. All inference runs locally in the browser; after the first load the app works
   fully offline and no image leaves the device.

---

## Repository structure

```
malasense-ai/
├── README.md                     This file
├── LICENSE                       MIT license
├── requirements.txt              Python dependencies for the training notebooks
├── training/
│   ├── thin_smear_training.ipynb       Thin-smear classifier (EfficientNetB2)
│   ├── thick_smear_training.ipynb      Thick-smear classifier (EfficientNetB2)
│   └── thick_counting_model.ipynb      Detector + tiling + TF.js conversion
├── app/
│   ├── index.html                      PWA interface
│   ├── manifest.json                   PWA manifest
│   ├── service-worker.js               Offline caching
│   ├── model/                          Thin-smear TensorFlow.js model
│   └── model-thick/                    Thick-smear TensorFlow.js model
├── hardware/
│   └── (SolidWorks source and STL files for the smartphone-to-microscope mount)
└── docs/
    └── (dataset links, figures, and supplementary notes)
```

> Note: place the three notebooks you ran on Kaggle in `training/`, the current
> live-app files in `app/`, and export the mount CAD/STL files into `hardware/`.

---

## Models

| Model | Backbone | Smear type | Purpose |
|-------|----------|------------|---------|
| Thin classifier | EfficientNetB2 (ImageNet) | Thin | Parasitized vs uninfected |
| Thick classifier | EfficientNetB2 (ImageNet) | Thick | Parasitized vs uninfected |
| Parasite detector | YOLOv8-nano | Thick | Parasite localization and counting (exploratory) |

The classification models are deployed in the app as float16-quantized
TensorFlow.js graph models so they load and run in the browser.

---

## Datasets

The datasets are **not** redistributed in this repository. They are publicly
available from their original sources:

- **Thin smear (training):** NIH / NLM Malaria Cell Images dataset, 27,558
  segmented single-cell images (13,779 parasitized, 13,779 uninfected).
  Original source: Rajaraman et al., 2018. Commonly accessed via its Kaggle
  mirror.
- **Thick smear (training) and thin smear (external evaluation):** Nelson Mandela
  African Institution of Science and Technology (NM-AIST) Malaria Dataset,
  collected in Tanzania. Available via Harvard Dataverse,
  DOI: 10.7910/DVN/O2WVWA (Lufyagila et al., 2024).

Set the dataset paths at the top of each notebook to match where you have
downloaded or attached the data.

---

## Reproducing the models

The notebooks were developed and run in a **Kaggle** notebook environment with
two NVIDIA Tesla T4 GPUs. They can also be run in Google Colab or locally with a
compatible GPU.

### 1. Thin-smear classifier — `training/thin_smear_training.ipynb`
- Input 128 x 128 RGB; pixel values kept in the [0, 255] range (EfficientNetB2
  rescales internally, so do **not** divide by 255).
- EfficientNetB2 backbone, global average pooling, batch normalization, dropout
  (0.2 and 0.1), a 256-unit dense layer, and a sigmoid output.
- Binary cross-entropy, Adam at an initial learning rate of 1e-3, batch size 32.
- Stratified three-way split, early stopping (patience 7), and learning-rate
  reduction on plateau (factor 0.3).

### 2. Thick-smear classifier — `training/thick_smear_training.ipynb`
- Same backbone and input handling as the thin model.
- Dataset: NM-AIST thick fields (2,210 total; 1,139 infected, 1,071 uninfected),
  stratified 73/12/15 split.
- Two-phase fine-tuning: head first at 1e-3, then the upper backbone layers
  unfrozen at 5e-5, with batch-normalization layers kept frozen.
- Class weighting (infected class weighted 1.15x) and model selection on
  validation sensitivity, reflecting the higher cost of a missed infection.

### 3. Detector, tiling, and conversion — `training/thick_counting_model.ipynb`
- Thick fields are sliced into overlapping 640 x 640 tiles (20% overlap) so that
  small parasites are trained at native resolution; annotations are remapped to
  tile coordinates.
- The train / validation / test split is made at the **patient level** to prevent
  leakage.
- A YOLOv8-nano detector is trained (image size 640, batch 32, 60 epochs).
- At inference, tiles are recombined and duplicate detections in overlapping
  regions are merged with non-maximum suppression.
- This notebook also contains the quantization and TensorFlow.js conversion step
  used to prepare the models for in-browser deployment.

---

## Running the app

The app in `app/` is a static Progressive Web Application. To run it locally,
serve the folder with any static web server, for example:

```bash
cd app
python -m http.server 8000
```

then open `http://localhost:8000` in a browser. On first load the models and
interface are cached, after which the app runs offline. The live version is
hosted at: https://github.com/senahey/malasense-ai

---

## Hardware

The smartphone-to-microscope mount was designed in SolidWorks and 3D-printed in
PLA on a desktop FDM printer. It couples a smartphone to a conventional microscope
eyepiece so the phone camera is aligned with the optical axis. The CAD source and
printable STL files should be placed in `hardware/`.

Approximate key dimensions: eyepiece sleeve internal diameter 4.3 cm and length
7 cm; camera-side opening 5 cm; overall bracket 15 cm long and 7.6 cm wide.

---

## Limitations

This system has been evaluated on image datasets and in a single preliminary
functional test; it has not undergone prospective clinical validation. The
parasite detector is validated at the tile level and is not integrated into the
offline app, and the project-defined performance targets (95% sensitivity, 90%
specificity) are not a formal WHO competence standard. See the manuscript for the
full discussion of limitations.

---

## Citation

If you use this work, please cite the accompanying manuscript. A `CITATION.cff`
file can be added once the paper's final reference details are available.

## License

This project is released under the MIT License. See `LICENSE`.
