"""
GrievanceHUB Model Evaluation Framework (Phase 8 & 9)
Provides clean, mathematically accurate evaluation metrics and confusion matrix calculations
using pure Python standard libraries without external dependency requirements.
"""

from typing import List, Dict, Any, Tuple
import json
import math

class ClassificationEvaluator:
    """
    Standard multi-class classification evaluation suite.
    Calculates Accuracy, Precision, Recall, F1 (Macro, Weighted, Micro),
    Per-class breakdowns, Support, and Confusion Matrices.
    """
    def __init__(self, target_classes: List[str]):
        self.target_classes = target_classes
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(target_classes)}
        self.idx_to_class = {i: cls_name for i, cls_name in enumerate(target_classes)}
        self.num_classes = len(target_classes)

    def compute_confusion_matrix(self, y_true: List[str], y_pred: List[str]) -> List[List[int]]:
        """
        Computes the C x C confusion matrix where row = actual, column = predicted.
        """
        matrix = [[0 for _ in range(self.num_classes)] for _ in range(self.num_classes)]
        for true_label, pred_label in zip(y_true, y_pred):
            if true_label in self.class_to_idx and pred_label in self.class_to_idx:
                r = self.class_to_idx[true_label]
                c = self.class_to_idx[pred_label]
                matrix[r][c] += 1
        return matrix

    def compute_metrics(self, y_true: List[str], y_pred: List[str]) -> Dict[str, Any]:
        """
        Computes all standard classification metrics from ground truth and predictions.
        """
        if len(y_true) != len(y_pred):
            raise ValueError(f"Length mismatch: y_true ({len(y_true)}) != y_pred ({len(y_pred)})")

        total_samples = len(y_true)
        if total_samples == 0:
            return {"error": "Empty evaluation dataset"}

        matrix = self.compute_confusion_matrix(y_true, y_pred)
        
        per_class_metrics = {}
        total_correct = 0
        macro_p_sum = 0.0
        macro_r_sum = 0.0
        macro_f1_sum = 0.0
        weighted_p_sum = 0.0
        weighted_r_sum = 0.0
        weighted_f1_sum = 0.0

        for idx, cls_name in enumerate(self.target_classes):
            tp = matrix[idx][idx]
            fp = sum(matrix[r][idx] for r in range(self.num_classes) if r != idx)
            fn = sum(matrix[idx][c] for c in range(self.num_classes) if c != idx)
            tn = total_samples - (tp + fp + fn)
            support = sum(matrix[idx][c] for c in range(self.num_classes))
            total_correct += tp

            precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
            recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
            f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

            per_class_metrics[cls_name] = {
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1_score": round(f1, 4),
                "support": support,
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "tn": tn
            }

            macro_p_sum += precision
            macro_r_sum += recall
            macro_f1_sum += f1

            weighted_p_sum += precision * support
            weighted_r_sum += recall * support
            weighted_f1_sum += f1 * support

        accuracy = total_correct / total_samples
        macro_precision = macro_p_sum / self.num_classes
        macro_recall = macro_r_sum / self.num_classes
        macro_f1 = macro_f1_sum / self.num_classes

        weighted_precision = weighted_p_sum / total_samples
        weighted_recall = weighted_r_sum / total_samples
        weighted_f1 = weighted_f1_sum / total_samples

        return {
            "total_samples": total_samples,
            "total_correct": total_correct,
            "accuracy": round(accuracy, 4),
            "macro_precision": round(macro_precision, 4),
            "macro_recall": round(macro_recall, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_precision": round(weighted_precision, 4),
            "weighted_recall": round(weighted_recall, 4),
            "weighted_f1": round(weighted_f1, 4),
            "per_class": per_class_metrics,
            "confusion_matrix": matrix,
            "classes": self.target_classes
        }

    def format_classification_report(self, metrics: Dict[str, Any]) -> str:
        """
        Formats metrics into an ASCII classification report table matching sklearn format.
        """
        lines = []
        lines.append(f"{'Class':<48} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'Support':>10}")
        lines.append("-" * 92)
        
        per_class = metrics.get("per_class", {})
        for cls_name in self.target_classes:
            m = per_class.get(cls_name, {})
            p = m.get("precision", 0.0)
            r = m.get("recall", 0.0)
            f1 = m.get("f1_score", 0.0)
            sup = m.get("support", 0)
            lines.append(f"{cls_name:<48} {p:>10.4f} {r:>10.4f} {f1:>10.4f} {sup:>10d}")
            
        lines.append("-" * 92)
        lines.append(f"{'Accuracy':<48} {'':>10} {'':>10} {metrics.get('accuracy', 0.0):>10.4f} {metrics.get('total_samples', 0):>10d}")
        lines.append(f"{'Macro Avg':<48} {metrics.get('macro_precision', 0.0):>10.4f} {metrics.get('macro_recall', 0.0):>10.4f} {metrics.get('macro_f1', 0.0):>10.4f} {metrics.get('total_samples', 0):>10d}")
        lines.append(f"{'Weighted Avg':<48} {metrics.get('weighted_precision', 0.0):>10.4f} {metrics.get('weighted_recall', 0.0):>10.4f} {metrics.get('weighted_f1', 0.0):>10.4f} {metrics.get('total_samples', 0):>10d}")
        
        return "\n".join(lines)


if __name__ == "__main__":
    print("GrievanceHUB ClassificationEvaluator initialized. Ready for Phase 9 model benchmarking.")
