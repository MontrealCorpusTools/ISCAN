import os
import shutil

aligned_dir = r'D:\Data\Cont\aligned'

source_dir = r'D:\Dropbox\cont\0_original_experiment\2_cont\2_data\1_soundfiles'

out_dir = r'D:\Data\Cont\cont'

for f in os.listdir(aligned_dir):
    if f == 'oovs_found.txt':
        continue
    speaker = '_'.join(f.split('_')[0:2])
    speaker_dir = os.path.join(out_dir, speaker)
    os.makedirs(speaker_dir, exist_ok = True)
    shutil.copy(os.path.join(aligned_dir, f), speaker_dir)
    wav_path = os.path.join(source_dir, f.replace('.TextGrid', '.wav'))
    shutil.copy(wav_path, speaker_dir)
