# Email categorization

This web application automatically classifies email texts into 34 distinct categories. The classifier is based on deepset/gbert-base (BERT for German) and is trained on an internal dataset of 5,000 labeled emails.
The training pipeline now includes an explicit validation split for checkpoint selection via macro F1 and early stopping. Final quality is reported on a held-out test set that is never used for model selection.

## Project structure

``` bash
email-classification/
├── frontend                            # React web app
├── server.py                           # FastAPI backend
├── model_dev/
│   ├── prepared_data                   # test/train data, label encoder
│   ├── cat_emails_v2.csv               # original dataset
│   ├── overview_data.ipynb             # notebook discovering original dataset
│   ├── train_bert.ipynb                # experiments with training
└── .gitignore
```

## Dataset
The dataset consists of 5,000 labeled emails categorized into 34 distinct classes, including:

*Financing balance credit, Third party purchase, Account clarification, Follow-up Contract, Devinculation, Credit item, Bank statement, Compensation release, Call-back, Data extract, Complaint, FB Lustum/beneficial owner, Claims management, General contract information, Financing balance residual value leasing, Duplicate/KSV block, 1st Level Onlinetools, Policy/endorsement/cover, Unsubscribe, HB & HBO, Vinculation, Insurance change, Damage report/repair approval, Contract rewriting, Contract adjustment, Insurance offer, Change customer data, Cancellation, Change in payment transactions, General enquiry/errors, Fuel card/maintenance, Calculations, Sanierung, Liability Insurer*

Class counts are imbalanced (some classes ~200 samples, others ~100).

![There should be distribution histogram](srcForREADME/cat_distribution.png)

Key statistics:
- Imbalance Ratio: 2.69
- Mean count per class: 147.06
- Standard deviation: 30.52



The train-test split was performed to preserve the original class distribution, ensuring that all classes are represented in the same proportions in the training set (4,500 emails) and the test set (500 emails). 
From the training set of 4,500 emails, was created a stratified Train/Val split of 85%/15% while enforcing at least 8 samples per class in validation (when needed, missing samples are moved from train to val). This yields approximately 3,825 train and 675 validation samples while preserving class proportions.

## Model

The email classifier is a fine-tuned German BERT model ([deepset/gbert-base](https://huggingface.co/deepset/gbert-base)) trained with the Hugging Face Trainer API. The setup focuses on validation-based checkpointing and reproducibility (restoring the best checkpoint by macro F1 with early stopping).

Core training settings:
- Max sequence length: 384–512 (per experiment)
- Train batch size: 8 (eval batch size: 16)
- Epochs: 5–6
- Learning rate: 2e-5
- Optimizer: AdamW (weight decay = 0.01)
- Warmup ratio: 0.06–0.10
- Early stopping: patience = 2
- Mixed precision: fp16 when CUDA is available
- Metric for best model: macro F1 on validation

Class imbalance handling:
- Loss: CrossEntropyLoss with class weights derived from inverse class frequency (normalized).
- Smoothing/tempering: in newer experiments, weights are softened via exponent ^0.5 to avoid over-penalizing frequent classes.
- Targeted boost (latest experiment): for historically hard classes
*Financing balance residual value leasing, Financing balance credit, Bank statement, Insurance change, General enquiry/errors*
the base weights are multiplied by 1.8 before softening.
- Label smoothing: 0.05 in experiments using softened/boosted weights.

Experiments overview:
- Experiment 1: max_length=512, warmup 0.06, class weights (inverse-freq), no label smoothing, epochs 5.
- Experiment 2: max_length=384, warmup 0.10, class weights (inverse-freq) ^0.5, label_smoothing=0.05, epochs 6.
- Experiment 3 (current best candidate): max_length=384, warmup 0.10, class weights with 1.8× boost on hard classes then ^0.5, label_smoothing=0.05, epochs 6.

Classification report for experiment 1 is available [here](model_dev/gbert_email_classifier2/test_classification_report.txt).

Classification report for experiment 2 is available [here](model_dev/gbert_email_classifier3/test_classification_report.txt).

Classification report for experiment 3 is available [here](model_dev/gbert_email_classifier4/test_classification_report.txt).

**Results**

| Experiment | Accuracy | Macro F1 | Weighted F1 |
|------------|----------|----------|-------------|
| Exp 1.     | 0.876    | 0.874    | 0.875       |
| Exp 2.     | 0.876.   | 0.873    | 0.875       |
| Exp 3.     | pending  | pending  |pending      |

Experiment 1 - Baseline (512 tokens, no smoothing):
- Macro F1 = 0.8737, Accuracy = 0.876.
- Most categories achieved F1 ≥ 0.85; top-performing classes include *Unsubscribe (1.00), Call-back (0.96), Liability Insurer (0.96)*.
- Underperforming classes: *Financing balance credit (0.75), Financing balance residual value leasing (0.70), Bank statement (0.69), General contract information (0.71)*.

Experiment 2 - 384 tokens + Label Smoothing 0.05:
- Macro F1 = 0.8732, Accuracy = 0.876, performance stable vs Exp 1.
- Label smoothing improved calibration and reduced over-confidence without changing overall accuracy.
- Improved classes: *Bank statement (+0.01 F1), Compensation release (+0.01 F1), Contract rewriting (+0.03 F1)*.
- Still weak: *Financing balance residual value leasing (0.52), Financing balance credit (0.77), Insurance change (0.80)*.

Experiment 3 - Boosted Class Weights (in progress):

This run increases class-weight multipliers for historically weak categories (×1.8 before normalization) combined with smoothing 0.05.
Expected outcome: higher macro F1 and narrower gap between financial vs service categories.
Results will be added once training completes.

> Note: historically, Financing balance credit and Financing balance residual value leasing underperform due to lower support; the latest weighting strategy aims to improve these without hurting major classes.

## How to run

1. Download [gbert_email_classifier.zip](https://drive.google.com/file/d/1VWfrqYZ4kSm8PJ6EfwRZXlRmUHX9KV5y/view?usp=share_link) and unarchive in *model_dev* directory. Today described models publically unavailable, so you could install only previous version. After unarchive .zip please rename this directory to 'gbert_email_classifier3' or change path to your directory in server.py.

2. Run the backend

``` bash
uvicorn server:app --reload
```

This starts FastAPI at http://localhost:8000.

> Make sure you have fastapi, torch, transformers, uvicorn installed. Unless run the command ```pip install fastapi torch transformers uvicorn```

3. Run web app

Install dependencies:

```bash
npm install --prefix frontend
```

Start the frontend in development mode:

```bash
npm run dev --prefix frontend
```

By default, it will be available at http://localhost:5173

## Additional info

To run Jupyter Notebook scripts to train the model you should have transformers library version less than 4.51 (I used 4.42) unless you will have troubles with training argument 'evaluation_strategy' which is not available in the newest version.