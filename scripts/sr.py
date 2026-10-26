import sys
D='/tmp/sr28pkg/package/data/'
AB=['ndb','shrt','water','kcal','protein','fat','ash','carb','fiber','sugar','calcium','iron','magnesium','phosphorus','potassium','sodium','zinc','copper','manganese','selenium','vitc','thiamin','riboflavin','niacin','panto','vitb6','folate','folic','foodfolate','folatedfe','choline','vitb12','vitaiu','vitarae','retinol','acarot','bcarot','bcrypt','lycopene','lutzea','vite','vitdmcg','vitdiu','vitk','fasat','famono','fapoly','chol','gm1','gm1d','gm2','gm2d','refuse']
FD=['ndb','grp','long','shrt','com','manuf','survey','refdesc','refuse','sci','nf','pf','ff','cf']
def parse(path,names):
    out={}
    for line in open(path,encoding='latin-1'):
        parts=[p.strip('~') for p in line.rstrip('\r\n').split('^')]
        d=dict(zip(names,parts)); out[d['ndb']]=d
    return out
ab=parse(D+'ABBREV.txt',AB); fd=parse(D+'FOOD_DES.txt',FD)
if __name__=='__main__':
    for q in sys.argv[1:]:
        terms=q.lower().split('&')
        print('== ',q)
        for k,v in fd.items():
            if all(t.strip() in v['long'].lower() for t in terms):
                a=ab[k]; print(k,'|',v['long'],'| kcal',a['kcal'],'P',a['protein'],'F',a['fat'],'C',a['carb'],'Fib',a['fiber'],'| refuse',v['refuse'],v['refdesc'][:40])
