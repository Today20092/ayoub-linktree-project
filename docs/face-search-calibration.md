# Angel's face-search calibration

This first section records the historical Human model calibration. Angel's
replacement SFace index uses the separate model-specific evaluation described
in the [SFace gallery workflow](sface-gallery-workflow.md#calibrate-and-check).
Its threshold is 0.5580291381871154, not the old Human threshold of 0.62.

Event: `angels-birthday-party-2026`, October 24, 2026. The index contains 1,476
face descriptors from 494 of the 517 delivered photographs.

## Method

The local evaluation used 46 photographs spanning posed groups, smaller groups,
blue decorative lighting, firelight, and the cake sequence. All six annotated
contact sheets were inspected for scene continuity. Positive labels came from
mutual face-box overlap of at least 0.7 in adjacent frames and manually checked
scene/clothing correspondences across different compositions. Similarity scores
were not used to assign labels. Negative labels came from separate,
non-overlapping face detections within the same photograph.

Training used 32 photographs: 67 positive and 372 negative pairs. Validation used
14 different photographs: 34 positive and 110 negative pairs. No photograph was
in both sets. Attendees can appear in both sets, so this is a photograph-disjoint
event check, not an identity-disjoint or fresh-selfie benchmark. Closely related
burst frames also make it easier than general selfie retrieval.

The training candidate maximized the existing calibration helper's F1 score. A
midpoint between adjacent training scores, rounded to three decimal places,
avoided placing the deployed threshold directly on a floating-point score.

## Threshold decision

| Validation result       | Default 0.62 | Training candidate 0.648 |
| ----------------------- | -----------: | -----------------------: |
| Positive pairs retained |      34 / 34 |                  32 / 34 |
| False matches           |      3 / 110 |                  2 / 110 |
| Precision               |        91.9% |                    94.1% |
| Recall                  |         100% |                    94.1% |
| F1                      |        0.958 |                    0.941 |

Retain **0.62** for this gallery. The stricter training candidate lost two
validation positives and had lower F1. Calibration does not justify raising the
threshold when the immediate goal is to find more of an attendee's photographs.
These sample figures are not guarantees for arbitrary selfies or other events.

## Retrieval check

Using the unchanged 0.62 threshold, exact offline cosine scoring of every stored
event face found 167 distinct possible photographs for the test descriptor
`P1034546-1`. The old top-50-face query could expose only 50. Five additional test
descriptors had 27–47 distinct above-threshold photographs; removing the cutoff
should preserve their results rather than artificially inflate them.

The production algorithm uses adaptive, event-local numeric ranges in Vectorize,
then deduplicates photographs. Runtime queries must be checked against the
offline counts and a query near the end of the event index after ingestion.
Vectorize is approximate, so runtime counts may differ from exact cosine counts.

## Local evidence and reproduction

The ignored `.face-index/angels-birthday-party-2026/calibration/` directory holds
the annotated sheets, `boxes.json`, `labels.json`, `report.json`, and
`retrieval-baseline.json`. The parent folder contains the original and
managed-filename face indexes. These source images, descriptors, and evaluation
artifacts stay local; they are not repository fixtures.

The local `calibrate-bursts.mjs` script reconstructs the boxes using the same
indexing pipeline, verifies every descriptor against the saved index, and
computes training/validation metrics. Source JPEGs were read from
`G:/DCIM/103AYOUB` without modification. A new event or materially different
query image distribution requires its own validation.
